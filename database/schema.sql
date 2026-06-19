-- ============================================================
-- ATTEND-PRO DATABASE SCHEMA
-- Smart Attendance Management System
-- PostgreSQL / Supabase Compatible
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE 1 : PROFILES
-- ============================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    full_name TEXT NOT NULL,

    email TEXT UNIQUE NOT NULL,

    phone TEXT,

    role TEXT NOT NULL
    CHECK (role IN ('SUPER_ADMIN','STAFF')),

    status TEXT DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INACTIVE')),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 2 : CLASSES
-- ============================================================

CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    class_name TEXT NOT NULL,

    department TEXT NOT NULL,

    batch_type TEXT NOT NULL
    CHECK (
        batch_type IN (
            'MORNING',
            'EVENING',
            'MORNING_EVENING'
        )
    ),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 3 : STUDENTS
-- ============================================================

CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    roll_no TEXT UNIQUE NOT NULL,

    register_no TEXT UNIQUE,

    student_name TEXT NOT NULL,

    parent_name TEXT,

    parent_mobile TEXT,

    student_mobile TEXT,

    email TEXT,

    department TEXT,

    year INTEGER,

    section TEXT,

    status TEXT DEFAULT 'ACTIVE'
    CHECK (
        status IN (
            'ACTIVE',
            'INACTIVE'
        )
    ),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 4 : STUDENT CLASS ASSIGNMENTS
-- ============================================================

CREATE TABLE public.student_class_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
    REFERENCES public.students(id)
    ON DELETE CASCADE,

    class_id UUID NOT NULL
    REFERENCES public.classes(id)
    ON DELETE CASCADE,

    assigned_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_student_class
    UNIQUE(student_id, class_id)
);

-- ============================================================
-- TABLE 5 : STAFF CLASS ASSIGNMENTS
-- ============================================================

CREATE TABLE public.staff_class_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    staff_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

    class_id UUID NOT NULL
    REFERENCES public.classes(id)
    ON DELETE CASCADE,

    assigned_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_staff_class
    UNIQUE(staff_id, class_id)
);

-- ============================================================
-- TABLE 6 : ATTENDANCE SESSIONS
-- ============================================================

CREATE TABLE public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    class_id UUID NOT NULL
    REFERENCES public.classes(id)
    ON DELETE CASCADE,

    session_date DATE NOT NULL,

    session_type TEXT NOT NULL
    CHECK (
        session_type IN (
            'MORNING',
            'EVENING'
        )
    ),

    created_by UUID
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

    is_locked BOOLEAN DEFAULT FALSE,

    locked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_attendance_session
    UNIQUE (
        class_id,
        session_date,
        session_type
    )
);

-- ============================================================
-- TABLE 7 : ATTENDANCE
-- ============================================================

CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    attendance_session_id UUID NOT NULL
    REFERENCES public.attendance_sessions(id)
    ON DELETE CASCADE,

    student_id UUID NOT NULL
    REFERENCES public.students(id)
    ON DELETE CASCADE,

    status TEXT NOT NULL
    CHECK (
        status IN (
            'PRESENT',
            'ABSENT'
        )
    ),

    recorded_by UUID
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_session_student
    UNIQUE (
        attendance_session_id,
        student_id
    )
);

-- ============================================================
-- TABLE 8 : SMS LOGS
-- ============================================================

CREATE TABLE public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID
    REFERENCES public.students(id)
    ON DELETE SET NULL,

    mobile_number TEXT,

    message TEXT,

    status TEXT
    CHECK (
        status IN (
            'PENDING',
            'SENT',
            'FAILED'
        )
    ),

    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_students_roll_no
ON public.students(roll_no);

CREATE INDEX idx_students_department
ON public.students(department);

CREATE INDEX idx_classes_department
ON public.classes(department);

CREATE INDEX idx_attendance_session
ON public.attendance(attendance_session_id);

CREATE INDEX idx_attendance_student
ON public.attendance(student_id);

CREATE INDEX idx_attendance_date
ON public.attendance_sessions(session_date);

CREATE INDEX idx_attendance_class
ON public.attendance_sessions(class_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.student_class_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.staff_class_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- IMPLEMENT IN PHASE 5
-- ============================================================

-- Super Admin Policies
-- Staff Policies
-- Assignment Based Policies
-- Attendance Policies

-- To be implemented after authentication setup.