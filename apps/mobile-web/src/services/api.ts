import { Platform } from 'react-native';
import { ApiResponse, AuthResponse, GoogleAuthDto, IUser, LoginDto, RegisterDto } from '@monett/shared';

// Xác định địa chỉ Backend phù hợp với thiết bị (Web, Điện thoại qua Expo Go hoặc Mobile Browser)
export const getBaseUrl = (): string => {
  // 1. Nếu chạy trên Web browser (PC hoặc Mobile Browser)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    if (hostname.includes('ngrok')) {
      return `${window.location.protocol}//${hostname}`;
    }
    return `http://${hostname}:3000`;
  }

  // 2. Nếu chạy Native Mobile App (iOS / Android trong Expo Go)
  try {
    const Constants = require('expo-constants').default;
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      Constants.manifest?.debuggerHost ||
      '';
    if (hostUri) {
      if (hostUri.includes('ngrok')) {
        return `https://${hostUri}`;
      }
      const hostIp = hostUri.split(':')[0];
      const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostIp);
      if (isIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        return `http://${hostIp}:3000`;
      }
    }
  } catch (e) {
    console.warn('Resolve host IP notice:', e);
  }

  // 3. Fallback: Địa chỉ IP Wi-Fi của máy chủ phát triển
  return 'http://192.168.1.4:3000';
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
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${getBaseUrl()}${endpoint}`;
  console.log('[API] Sending request to:', url);
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
): Promise<{ message: string }> => {
  const res = await request<{ message: string }>(
    '/api/auth/send-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );
  return res.data!;
};

export const verifyOtpApi = async (
  email: string,
  otp: string,
): Promise<{ message: string }> => {
  const res = await request<{ message: string }>(
    '/api/auth/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    },
  );
  return res.data!;
};

export const forgotPasswordApi = async (
  email: string,
): Promise<{ message: string }> => {
  const res = await request<{ message: string }>(
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

