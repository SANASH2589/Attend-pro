export interface Class {
  id: string;
  name: string;
  batch_type: 'morning' | 'evening' | 'both';
  morning_start?: string | null;
  morning_lock?: string | null;
  evening_start?: string | null;
  evening_lock?: string | null;
  created_at?: string;
  student_count?: number;
  assigned_staff_id?: string | null;
  staff_name?: string | null;
}
