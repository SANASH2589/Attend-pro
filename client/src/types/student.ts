export interface Student {
  id: string;
  roll_number: string;
  full_name: string;
  parent_phone: string;
  email?: string;
  class_id?: string;
  created_at?: string;
  status?: 'active' | 'inactive';
}

export interface StudentQueryParams {
  search?: string;
  class_id?: string;
}
