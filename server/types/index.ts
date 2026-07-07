import type { Request, Response, NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Environment Variables
// ============================================================

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      NODE_ENV?: string;
      DATABASE_URL?: string;
      CLIENT_URL?: string;
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
      SMS_PROVIDER?: string;
      MSG91_AUTH_KEY?: string;
      MSG91_SENDER_ID?: string;
      MSG91_TEMPLATE_ID?: string;
      SMS_ENABLED?: string;
    }
  }
}

// ============================================================
// Express Request Augmentation
// ============================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
      };
    }
  }
}

// ============================================================
// Database Model Interfaces
// ============================================================

export interface Profile {
  id: string;
  email: string;
  role: string;
  full_name: string;
  phone?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface NormalizedProfile {
  id: string;
  email: string;
  role: string;
  full_name: string;
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Student {
  id: string;
  roll_number: string;
  full_name: string;
  parent_phone: string;
  email?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface ClassConfig {
  id: string;
  name: string;
  batch_type: 'morning' | 'evening' | 'both';
  morning_start?: string | null;
  morning_lock?: string | null;
  evening_start?: string | null;
  evening_lock?: string | null;
  created_by?: string;
  created_at?: string;
}

export interface ClassWithMetrics extends ClassConfig {
  student_count: number;
  staff_count: number;
}

export interface AttendanceSession {
  id: string;
  class_id: string;
  staff_id: string;
  session_date: string;
  session_type: 'morning' | 'evening';
  is_locked: boolean;
  locked_at?: string | null;
  total_students: number;
  total_absent: number;
  submitted_at?: string;
  classes?: { name: string };
  profiles?: { full_name: string };
  users?: { full_name: string };
}

export interface AttendanceRecord {
  id?: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent';
  student?: {
    roll_number: string;
    full_name: string;
  };
}

export interface StudentClassAssignment {
  id?: string;
  student_id: string;
  class_id: string;
}

export interface StaffClassAssignment {
  id?: string;
  staff_id: string;
  class_id: string;
}

export interface AuditLogEntry {
  action: string;
  actor_id?: string;
  session_id?: string;
}

// ============================================================
// Session State Types
// ============================================================

export type SessionStatus =
  | 'not_applicable'
  | 'not_yet_open'
  | 'open'
  | 'closed'
  | 'locked';

export interface SessionState {
  status: SessionStatus;
  session_id: string | null;
  is_submitted: boolean;
  is_locked?: boolean;
  submitted_at?: string;
  opens_at: string | null;
  locks_at: string | null;
}

// ============================================================
// Stats & Report Types
// ============================================================

export interface StudentAttendanceStats {
  total_sessions: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface ClassSessionStat {
  session_id: string;
  session_date: string;
  session_type: string;
  total_students: number;
  present_students: number;
  absent_students: number;
  percentage: number;
}

export interface ClassAttendanceStats {
  overall: {
    total_sessions: number;
    total_students_registered: number;
    present_students_registered: number;
    absent_students_registered: number;
    percentage: number;
  };
  sessions: ClassSessionStat[];
}

export interface FullStudentReport {
  student: {
    id: string;
    roll_number: string;
    full_name: string;
    parent_phone?: string;
  };
  class: { id: string; name: string } | null;
  period: { from: string | undefined; to: string | undefined };
  summary: {
    total_sessions: number;
    present: number;
    absent: number;
    percentage: number | null;
    consecutive_absences_max: number;
    last_absent_date: string | null;
  };
  sessions: SessionDetail[];
}

export interface SessionDetail {
  session_date: string;
  session_type: string;
  status: string | null;
  class_name: string;
  submitted_at?: string;
}

export interface DailyStat {
  session_date: string;
  session_type: string;
  total: number;
  present: number;
  absent: number;
  percentage: number | null;
}

export interface StudentStat {
  id: string;
  roll_number: string;
  full_name: string;
  total_sessions: number;
  present: number;
  absent: number;
  percentage?: number | null;
}

export interface DayInfo {
  date: string;
  percentage: number;
}

export interface FullClassReport {
  class: { id: string; name: string; batch_type: string };
  period: { from: string | undefined; to: string | undefined };
  summary: {
    total_sessions: number;
    avg_attendance_pct: number | null;
    best_day: DayInfo | null;
    worst_day: DayInfo | null;
  };
  students: StudentStat[];
  daily: DailyStat[];
}

export interface ClassOverviewItem {
  class_id: string;
  class_name: string;
  total_sessions: number;
  avg_pct: number | null;
  total_students: number;
}

export interface StaffOverviewItem {
  staff_id: string;
  staff_name: string;
  sessions_taken: number;
  avg_pct_their_classes: number | null;
}

export interface LowAttendanceStudent {
  student_id: string;
  roll_number: string;
  full_name: string;
  class_name: string;
  overall_pct: number | null;
}

export interface AdminOverviewReport {
  period: { from: string | undefined; to: string | undefined };
  overall: {
    total_sessions: number;
    avg_attendance_pct: number | null;
  };
  by_class: ClassOverviewItem[];
  by_staff: StaffOverviewItem[];
  low_attendance_students: LowAttendanceStudent[];
}

// ============================================================
// Import/Export Types
// ============================================================

export interface ImportValidationError {
  row: number;
  studentName: string;
  rollNumber: string;
  reasons: string[];
}

export interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
}

export interface NormalizedImportRow {
  rawIndex: number;
  roll_number?: string;
  full_name?: string;
  parent_phone?: string;
  email?: string | null;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiError {
  message: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface SubmitAttendanceResponse {
  session_id: string;
  total_students: number;
  total_absent: number;
  submitted_at: string;
  is_locked: boolean;
}

export interface PaginatedSessionsResponse {
  sessions: AttendanceSession[];
  total: number;
  page: number;
  limit: number;
}
