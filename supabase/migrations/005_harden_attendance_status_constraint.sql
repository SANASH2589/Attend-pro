-- ============================================================
-- ATTEND-PRO MIGRATION 005: Harden attendance status check constraint
-- ============================================================
-- 1. Normalize all existing status values in the base table to lowercase
UPDATE public.attendance 
SET status = lower(status);

-- 2. Drop the constraint if it exists on the view 'attendance_records' (from any incorrect runs)
ALTER VIEW IF EXISTS public.attendance_records ALTER COLUMN status DROP DEFAULT;

-- 3. Drop the outdated uppercase constraint on the base table 'attendance'
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;

-- 4. Add the corrected check constraint verifying status is lowercase 'present' or 'absent'
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'absent'));
