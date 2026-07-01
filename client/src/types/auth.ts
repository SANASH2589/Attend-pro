export type UserRole = 'super_admin' | 'staff';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  created_at?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  role?: UserRole;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
}
