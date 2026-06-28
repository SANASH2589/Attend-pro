-- ============================================================
-- ATTEND-PRO MIGRATION: AUDIT LOGS FOR MANUALLY UNLOCKED SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Super Admin policy to view and manage audit logs
CREATE POLICY super_admin_all ON public.audit_log
    FOR ALL TO authenticated USING (public.is_super_admin());
