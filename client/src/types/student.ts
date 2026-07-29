export interface Student {
  id: string;
  roll_number: string;
  full_name: string;
  parent_phone: string;
  email?: string | null;
  department?: string | null;
  section?: string | null;
  is_active: boolean;
  assigned_class?: string | null;
  created_at: string;
  updated_at: string;
  status?: 'active' | 'inactive';
}

export interface StudentQueryParams {
  search?: string;
  class_id?: string;
}
