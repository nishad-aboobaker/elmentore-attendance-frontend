export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department?: string;
  employeeId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  department?: string;
  employeeId?: string;
}
