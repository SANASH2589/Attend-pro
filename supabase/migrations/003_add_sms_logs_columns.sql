-- Migration: Add provider and error_message columns to sms_logs table

-- Check and add columns if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sms_logs' 
          AND column_name = 'provider'
    ) THEN
        ALTER TABLE public.sms_logs ADD COLUMN provider TEXT NOT NULL DEFAULT 'twilio';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sms_logs' 
          AND column_name = 'error_message'
    ) THEN
        ALTER TABLE public.sms_logs ADD COLUMN error_message TEXT;
    END IF;
END $$;
