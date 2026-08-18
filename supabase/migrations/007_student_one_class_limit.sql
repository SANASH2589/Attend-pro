-- Keep only the most recent assignment for each student
DELETE FROM student_class_assignments
WHERE id NOT IN (
  SELECT DISTINCT ON (student_id) id
  FROM student_class_assignments
  ORDER BY student_id, assigned_at DESC
);

-- Drop old unique constraint if exists
ALTER TABLE student_class_assignments
DROP CONSTRAINT IF EXISTS student_class_assignments_student_id_class_id_key;

-- Add new constraint: one class per student
ALTER TABLE student_class_assignments
ADD CONSTRAINT student_one_class_only
UNIQUE (student_id);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
