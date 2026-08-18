-- Migration: Remove SMS logs and related resources

-- Drop the sms_logs table and cascade to clean up all constraints, indices, and policies
DROP TABLE IF EXISTS public.sms_logs CASCADE;
