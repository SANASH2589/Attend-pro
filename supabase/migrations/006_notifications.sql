CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT gen_random_uuid() 
              PRIMARY KEY,
  user_id     UUID REFERENCES users(id) 
              ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info'
              CHECK (type IN (
                'sms_sent', 
                'sms_failed', 
                'session_locked', 
                'info'
              )),
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS notifications_user_id_read_idx ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS notifications_created_at_desc_idx ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications 
  ENABLE ROW LEVEL SECURITY;

-- Recreate policy if it exists, or create new
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications"
ON notifications FOR ALL
USING (user_id = auth.uid());

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
