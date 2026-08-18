-- ============================================================
-- ATTEND-PRO INITIAL DATABASE SCHEMA
-- PostgreSQL / Supabase Compatible Migration
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS TABLE (Extends auth.users)
-- ============================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'staff')),
    full_name TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. CLASSES TABLE
-- ============================================================
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    batch_type TEXT NOT NULL CHECK (batch_type IN ('morning', 'evening', 'both')),
    morning_start TIME,
    morning_lock TIME,
    evening_start TIME,
    evening_lock TIME,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. STUDENTS TABLE
-- ============================================================
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. STUDENT CLASS ASSIGNMENTS
-- ============================================================
CREATE TABLE public.student_class_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, class_id)
);

-- ============================================================
-- 5. STAFF CLASS ASSIGNMENTS
-- ============================================================
CREATE TABLE public.staff_class_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(staff_id, class_id)
);

-- ============================================================
-- 6. ATTENDANCE SESSIONS
-- ============================================================
CREATE TABLE public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('morning', 'evening')),
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    total_students INT,
    total_absent INT,
    UNIQUE(class_id, session_date, session_type)
);

-- ============================================================
-- 7. ATTENDANCE RECORDS
-- ============================================================
CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    marked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, student_id)
);

-- ============================================================
-- 8. SMS LOGS
-- ============================================================
CREATE TABLE public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    message_body TEXT,
    gateway_ref TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    retry_count INT DEFAULT 0,
    sent_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX ON public.attendance_records(session_id, student_id);
CREATE INDEX ON public.attendance_sessions(class_id, session_date);
CREATE INDEX ON public.staff_class_assignments(staff_id, class_id);
CREATE INDEX ON public.student_class_assignments(student_id, class_id);
CREATE INDEX ON public.students(roll_number);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Security Helper Functions to prevent recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'staff'
  );
END;
$$ LANGUAGE plpgsql;

-- 1. USERS POLICIES
CREATE POLICY super_admin_all ON public.users
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY user_read_own ON public.users
    FOR SELECT TO authenticated USING (auth.uid() = id);

-- 2. CLASSES POLICIES
CREATE POLICY super_admin_all ON public.classes
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY staff_select_assigned ON public.classes
    FOR SELECT TO authenticated USING (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.staff_class_assignments
            WHERE staff_id = auth.uid() AND class_id = classes.id
        )
    );

-- 3. STUDENTS POLICIES
CREATE POLICY super_admin_all ON public.students
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY staff_select_assigned ON public.students
    FOR SELECT TO authenticated USING (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.student_class_assignments sca
            JOIN public.staff_class_assignments sfca ON sca.class_id = sfca.class_id
            WHERE sfca.staff_id = auth.uid() AND sca.student_id = students.id
        )
    );

-- 4. STUDENT CLASS ASSIGNMENTS POLICIES
CREATE POLICY super_admin_all ON public.student_class_assignments
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY staff_select_assigned ON public.student_class_assignments
    FOR SELECT TO authenticated USING (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.staff_class_assignments
            WHERE staff_id = auth.uid() AND class_id = student_class_assignments.class_id
        )
    );

-- 5. STAFF CLASS ASSIGNMENTS POLICIES
CREATE POLICY super_admin_all ON public.staff_class_assignments
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY staff_select_assigned ON public.staff_class_assignments
    FOR SELECT TO authenticated USING (
        public.is_staff() AND staff_id = auth.uid()
    );

-- 6. ATTENDANCE SESSIONS POLICIES
CREATE POLICY super_admin_all ON public.attendance_sessions
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY staff_select_assigned ON public.attendance_sessions
    FOR SELECT TO authenticated USING (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.staff_class_assignments
            WHERE staff_id = auth.uid() AND class_id = attendance_sessions.class_id
        )
    );

CREATE POLICY staff_insert_assigned ON public.attendance_sessions
    FOR INSERT TO authenticated WITH CHECK (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.staff_class_assignments
            WHERE staff_id = auth.uid() AND class_id = attendance_sessions.class_id
        )
    );

CREATE POLICY staff_update_assigned ON public.attendance_sessions
    FOR UPDATE TO authenticated USING (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.staff_class_assignments
            WHERE staff_id = auth.uid() AND class_id = attendance_sessions.class_id
        )
    );

-- 7. ATTENDANCE RECORDS POLICIES
CREATE POLICY super_admin_all ON public.attendance_records
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY staff_select_assigned ON public.attendance_records
    FOR SELECT TO authenticated USING (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            JOIN public.staff_class_assignments sfca ON s.class_id = sfca.class_id
            WHERE sfca.staff_id = auth.uid() AND s.id = attendance_records.session_id
        )
    );

CREATE POLICY staff_insert_assigned ON public.attendance_records
    FOR INSERT TO authenticated WITH CHECK (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            JOIN public.staff_class_assignments sfca ON s.class_id = sfca.class_id
            WHERE sfca.staff_id = auth.uid() AND s.id = attendance_records.session_id
        )
    );

CREATE POLICY staff_update_assigned ON public.attendance_records
    FOR UPDATE TO authenticated USING (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            JOIN public.staff_class_assignments sfca ON s.class_id = sfca.class_id
            WHERE sfca.staff_id = auth.uid() AND s.id = attendance_records.session_id
        )
    );

-- 8. SMS LOGS POLICIES
CREATE POLICY super_admin_all ON public.sms_logs
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY staff_select_assigned ON public.sms_logs
    FOR SELECT TO authenticated USING (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            JOIN public.staff_class_assignments sfca ON s.class_id = sfca.class_id
            WHERE sfca.staff_id = auth.uid() AND s.id = sms_logs.session_id
        )
    );

CREATE POLICY staff_insert_assigned ON public.sms_logs
    FOR INSERT TO authenticated WITH CHECK (
        public.is_staff() AND EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            JOIN public.staff_class_assignments sfca ON s.class_id = sfca.class_id
            WHERE sfca.staff_id = auth.uid() AND s.id = sms_logs.session_id
        )
    );
