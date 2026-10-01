import { Platform } from 'react-native';
import { ApiResponse, AuthResponse, GoogleAuthDto, IUser, LoginDto, RegisterDto } from '@monett/shared';

// Xác định địa chỉ Backend phù hợp với thiết bị (Web, Điện thoại qua Expo Go hoặc Mobile Browser)
export const getBaseUrl = (): string => {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // 1. Nếu có cấu hình https (production domain hoặc cloud tunnel) -> ưu tiên dùng ở mọi nơi
  if (envApiUrl && envApiUrl.startsWith('https://')) {
    return envApiUrl.replace(/\/$/, '');
  }

  // 2. Nếu chạy trên Web browser (PC hoặc Mobile Browser)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Chạy trực tiếp trên máy tính dev (localhost / 127.0.0.1)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // Chạy qua tunnel domain
    if (hostname.includes('ngrok') || hostname.includes('trycloudflare') || hostname.includes('vercel.app')) {
      return `${window.location.protocol}//${hostname}`;
    }
    // Mở web qua IP LAN từ thiết bị khác (VD: http://10.12.1.76:8081 -> gọi http://10.12.1.76:3000)
    return `http://${hostname}:3000`;
  }

  // 3. Nếu chạy Native Mobile App (iOS / Android trong Expo Go)
  try {
    const Constants = require('expo-constants').default;
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      Constants.manifest?.debuggerHost ||
      '';
    if (hostUri) {
      if (hostUri.includes('ngrok') || hostUri.includes('exp.direct') || hostUri.includes('trycloudflare') || hostUri.includes('loca.lt')) {
        const cleanHost = hostUri.split(':')[0];
        return `https://${cleanHost}`;
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

  // 4. Nếu có envApiUrl cụ thể
  if (envApiUrl) {
    return envApiUrl.replace(/\/$/, '');
  }

  // 5. Fallback mặc định
  return 'http://localhost:3000';
};


// Chuyển avatarUrl dạng http://localhost:3000/uploads/xxx sang base URL của môi trường hiện tại
// để avatar hiển thị đúng trên mobile (khi dùng ngrok tunnel hoặc LAN IP)
export const normalizeAvatarUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  const base = getBaseUrl();
  // Nếu là relative path
  if (url.startsWith('/uploads')) {
    return `${base}${url}`;
  }
  if (url.startsWith('uploads/')) {
    return `${base}/${url}`;
  }
  // Nếu URL chứa localhost hoặc 127.0.0.1
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    const pathMatch = url.match(/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/.*)?$/);
    const path = pathMatch?.[1] || '';
    return `${base}${path}`;
  }
  return url;
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
    'Bypass-Tunnel-Reminder': 'true',
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

  let json;
  try { json = await response.json(); } catch(e) { throw new Error('Server error'); }
  console.log('[API] <--', response.status, endpoint, JSON.stringify(json).substring(0, 400));
  if (!response.ok) {
    const msgArr = json && json.message;
    const errMsg = Array.isArray(msgArr) ? msgArr.join(', ') : (msgArr || (json && json.error) || ('HTTP ' + response.status));
    throw new Error(errMsg);
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
  if (res.data?.user?.avatarUrl) {
    res.data.user.avatarUrl = normalizeAvatarUrl(res.data.user.avatarUrl) as string;
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
  if (res.data?.user?.avatarUrl) {
    res.data.user.avatarUrl = normalizeAvatarUrl(res.data.user.avatarUrl) as string;
  }
  return res.data!;
};

export const getMeApi = async (): Promise<IUser> => {
  const res = await request<IUser>('/api/auth/me', {
    method: 'GET',
  });
  const user = res.data!;
  // Normalize avatarUrl de hien thi dung tren mobile
  if (user && user.avatarUrl) {
    user.avatarUrl = normalizeAvatarUrl(user.avatarUrl) as string;
  }
  return user;
};

export const googleAuthApi = async (dto: GoogleAuthDto): Promise<AuthResponse> => {
  const res = await request<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  if (res.data?.accessToken) {
    setAuthToken(res.data.accessToken);
  }
  if (res.data?.user?.avatarUrl) {
    res.data.user.avatarUrl = normalizeAvatarUrl(res.data.user.avatarUrl) as string;
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

// Users API
export const updateProfileApi = async (dto: { fullName?: string; avatarUrl?: string; theme?: string; currency?: string; reminderTime?: string }): Promise<IUser> => {
  const res = await request<IUser>('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
  return res.data!;
};

export const changePasswordApi = async (dto: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
  const res = await request<{ message: string }>('/api/users/change-password', {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
  return res.data!;
};

export const uploadAvatarApi = async (imageUri: string, mimeType: string, filename: string): Promise<IUser> => {
  const token = getAuthToken();
  const url = `${getBaseUrl()}/api/users/upload-avatar`;

  const formData = new FormData();
  
  if (Platform.OS === 'web') {
    // Trên web, cần fetch lấy Blob từ blob URI rồi append
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append('file', blob, filename);
  } else {
    // Trên Mobile (React Native), FormData nhận object đặc biệt này
    formData.append('file', {
      uri: imageUri,
      type: mimeType,
      name: filename,
    } as any);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      // Do not set Content-Type for FormData, fetch will set it automatically with boundary
    },
    body: formData,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Error uploading avatar');
  }
  const userData = json.data;
  // Normalize avatarUrl sau upload de hien thi dung tren mobile
  if (userData && userData.avatarUrl) {
    userData.avatarUrl = normalizeAvatarUrl(userData.avatarUrl) as string;
  }
  return userData;
};

// Friends API
export const sendFriendRequestApi = async (recipientId: string) => {
  const res = await request('/api/friends/request', {
    method: 'POST',
    body: JSON.stringify({ recipientId }),
  });
  return res;
};

export const getFriendRequestsApi = async () => {
  const res = await request<any>('/api/friends/requests');
  const list = Array.isArray(res) ? res : (res?.data || []);
  return list.map((req: any) => ({
    ...req,
    requester: req.requester ? { ...req.requester, avatarUrl: normalizeAvatarUrl(req.requester.avatarUrl) } : req.requester,
  }));
};

export const getFriendsApi = async () => {
  const res = await request<any>('/api/friends');
  const list = Array.isArray(res) ? res : (res?.data || []);
  return list.map((f: any) => ({
    ...f,
    avatarUrl: normalizeAvatarUrl(f.avatarUrl),
    requester: f.requester ? { ...f.requester, avatarUrl: normalizeAvatarUrl(f.requester.avatarUrl) } : f.requester,
    recipient: f.recipient ? { ...f.recipient, avatarUrl: normalizeAvatarUrl(f.recipient.avatarUrl) } : f.recipient,
  }));
};

export const respondFriendRequestApi = async (requestId: string, status: 'accepted' | 'rejected') => {
  const res = await request(`/api/friends/request/${requestId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  return res;
};

export const getMomentsFeedApi = async () => {
  const res = await request<any>('/api/moments/feed');
  const items = Array.isArray(res) ? res : (res?.data || []);
  return items.map((m: any) => ({
    ...m,
    photo: normalizeAvatarUrl(m.photo) || m.photo,
    user: m.user ? {
      ...m.user,
      avatar: normalizeAvatarUrl(m.user.avatar),
    } : m.user,
  }));
};

export const uploadMomentPhotoApi = async (imageUri: string, mimeType: string, filename: string): Promise<string> => {
  const token = getAuthToken();
  const url = `${getBaseUrl()}/api/moments/upload-photo`;

  const formData = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append('file', blob, filename);
  } else {
    formData.append('file', {
      uri: imageUri,
      type: mimeType,
      name: filename,
    } as any);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: formData,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Lỗi khi tải ảnh khoảnh khắc lên');
  }
  return normalizeAvatarUrl(json.photoUrl) || json.photoUrl;
};

export const createMomentApi = async (data: {
  photo: string;
  caption?: string;
  amount?: number;
  category?: string;
}) => {
  const res = await request<any>('/api/moments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res;
};

export const updateMomentApi = async (
  momentId: string,
  data: {
    photo?: string;
    caption?: string;
    amount?: number;
    category?: string;
  }
) => {
  const res = await request<any>(`/api/moments/${momentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res;
};

export const deleteMomentApi = async (momentId: string) => {
  const res = await request<any>(`/api/moments/${momentId}`, {
    method: 'DELETE',
  });
  return res;
};

export const reactMomentApi = async (momentId: string, emoji: string) => {
  const res = await request<any>(`/api/moments/${momentId}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
  return res;
};

export const getStreakApi = async () => {
  const res = await request<{ streak: number; lastActiveDate: string; activeToday: boolean }>('/api/users/streak');
  return res;
};

export const checkInStreakApi = async () => {
  const res = await request<{ streak: number; message: string }>('/api/users/streak/check-in', {
    method: 'POST',
  });
  return res;
};

export const exportDataApi = async (
  format: 'csv' | 'json' = 'csv',
  clientTransactions: any[] = []
): Promise<Blob> => {
  const token = getAuthToken();
  const url = `${getBaseUrl()}/api/users/export-data`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'Bypass-Tunnel-Reminder': 'true',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ format, clientTransactions }),
  });

  if (!response.ok) {
    throw new Error('Lỗi xuất dữ liệu báo cáo');
  }

  return response.blob();
};

export const submitFeedbackApi = async (category: string, message: string): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  const response = await fetch(`${getBaseUrl()}/api/users/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'Bypass-Tunnel-Reminder': 'true',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ category, message }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Lỗi gửi góp ý');
  return data;
};

export const submitRatingApi = async (stars: number, comment?: string): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  const response = await fetch(`${getBaseUrl()}/api/users/rating`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'Bypass-Tunnel-Reminder': 'true',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ stars, comment }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Lỗi gửi đánh giá');
  return data;
};

// ============================================================
// TRANSACTION APIS
// ============================================================

export interface GetTransactionsQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
}

export const getTransactionsApi = async (query: GetTransactionsQuery = {}) => {
  const params = new URLSearchParams();
  if (query.page) params.append('page', String(query.page));
  if (query.limit) params.append('limit', String(query.limit));
  if (query.category) params.append('category', query.category);
  if (query.search) params.append('search', query.search);
  if (query.startDate) params.append('startDate', query.startDate);
  if (query.endDate) params.append('endDate', query.endDate);
  if (query.sort) params.append('sort', query.sort);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await request<any>(`/api/transactions${qs}`);
  return res;
};

export const createTransactionApi = async (data: {
  title: string;
  amount: number;
  type?: 'expense' | 'income';
  category: string;
  categoryIcon?: string;
  note?: string;
  photoUri?: string;
  walletId?: string;
  date?: string;
}) => {
  const res = await request<any>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res;
};

export const updateTransactionApi = async (id: string, data: any) => {
  const res = await request<any>(`/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res;
};

export const deleteTransactionApi = async (id: string) => {
  const res = await request<any>(`/api/transactions/${id}`, {
    method: 'DELETE',
  });
  return res;
};

// ============================================================
// BUDGET APIS
// ============================================================

export interface BudgetData {
  month: number;
  year: number;
  limit: number;
  spent: number;
  remaining: number;
  spentPercent: number;
  remainingPercent: number;
  status: 'safe' | 'warning' | 'danger';
  payday: number;
  daysUntilPayday: number;
  currency: string;
}

export const getBudgetApi = async (): Promise<BudgetData> => {
  const res = await request<BudgetData>('/api/budgets/current');
  return (res as any).data || res;
};

export const setBudgetApi = async (data: {
  limit: number;
  payday?: number;
  month?: number;
  year?: number;
  currency?: string;
}): Promise<BudgetData> => {
  const res = await request<BudgetData>('/api/budgets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return (res as any).data || res;
};


