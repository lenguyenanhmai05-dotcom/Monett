export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface IUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  currency?: string;
  role: UserRole;
  googleId?: string;
  authProvider?: 'local' | 'google';
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  currency?: string;
  otp?: string;
}

export interface SendOtpDto {
  email: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  otp: string;
  newPassword: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
}

export interface GoogleAuthDto {
  idToken?: string;
  code?: string;
  redirectUri?: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  googleId?: string;
}

export interface AuthResponse {
  user: IUser;
  accessToken: string;
}

