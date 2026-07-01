export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceSession {
  id: string;
  class_id: string;
  session_type: 'morning' | 'evening';
  is_locked: boolean;
  session_date: string;
  total_students: number;
  total_absent: number;
  submitted_at?: string;
  classes?: {
    name: string;
  };
  users?: {
    full_name: string;
  };
}

export interface AttendanceRecord {
  id: string;
  session_id?: string;
  student_id: string;
  status: AttendanceStatus;
  marked_at?: string;
  student?: {
    full_name: string;
    roll_number: string;
  };
}

export interface SessionStatus {
  status: 'not_yet_open' | 'open' | 'completed' | 'locked' | 'closed';
  opens_at?: string;
  locks_at?: string;
  session_id?: string | null;
  is_submitted?: boolean;
  submitted_at?: string;
}

export interface ClassSessionStatus {
  [key: string]: SessionStatus; // allow indexing by string like sessionType
  morning: SessionStatus;
  evening: SessionStatus;
}
