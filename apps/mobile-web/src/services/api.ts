import { Platform } from 'react-native';
import { ApiResponse, AuthResponse, GoogleAuthDto, IUser, LoginDto, RegisterDto } from '@monett/shared';

// Xác định địa chỉ Backend phù hợp với thiết bị
export const getBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  // iOS Simulator hoặc máy thật cùng mạng Wifi
  return 'http://localhost:3000';
};

const TOKEN_KEY = 'monett_auth_token';
let inMemoryToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
};

export const getAuthToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

// Hàm gọi API kèm token
const request = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${getBaseUrl()}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Đã có lỗi xảy ra từ máy chủ');
  }
  return json;
};

export const loginApi = async (dto: LoginDto): Promise<AuthResponse> => {
  const res = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  if (res.data?.accessToken) {
    setAuthToken(res.data.accessToken);
  }
  return res.data!;
};

export const registerApi = async (dto: RegisterDto): Promise<AuthResponse> => {
  const res = await request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  if (res.data?.accessToken) {
    setAuthToken(res.data.accessToken);
  }
  return res.data!;
};

export const getMeApi = async (): Promise<IUser> => {
  const res = await request<IUser>('/api/auth/me', {
    method: 'GET',
  });
  return res.data!;
};

export const googleAuthApi = async (dto: GoogleAuthDto): Promise<AuthResponse> => {
  const res = await request<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  if (res.data?.accessToken) {
    setAuthToken(res.data.accessToken);
  }
  return res.data!;
};

export const sendOtpApi = async (
  email: string,
): Promise<{ message: string; simulatedOtp?: string }> => {
  const res = await request<{ message: string; simulatedOtp?: string }>(
    '/api/auth/send-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );
  return res.data!;
};

export const forgotPasswordApi = async (
  email: string,
): Promise<{ message: string; simulatedOtp?: string }> => {
  const res = await request<{ message: string; simulatedOtp?: string }>(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );
  return res.data!;
};

export const resetPasswordApi = async (
  dto: { email: string; otp: string; newPassword: string },
): Promise<{ message: string }> => {
  const res = await request<{ message: string }>(
    '/api/auth/reset-password',
    {
      method: 'POST',
      body: JSON.stringify(dto),
    },
  );
  return res.data!;
};

