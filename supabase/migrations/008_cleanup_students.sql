-- Add department column
ALTER TABLE students
ADD COLUMN IF NOT EXISTS department TEXT;

-- Add section column  
ALTER TABLE students
ADD COLUMN IF NOT EXISTS section TEXT;

-- Add updated_at column with auto-update
ALTER TABLE students
ADD COLUMN IF NOT EXISTS updated_at 
  TIMESTAMPTZ DEFAULT now();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION 
  update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS 
  update_students_updated_at ON students;

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
