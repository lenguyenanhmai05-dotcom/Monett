import { Platform } from 'react-native';
import {
  ApiResponse,
  AuthResponse,
  GoogleAuthDto,
  IUser,
  LoginDto,
  RegisterDto,
  IAnalyticsOverview,
  IFullAnalyticsReport,
  AnalyticsPeriod,
  IDailySpendingTrend,
  ICategoryBreakdown,
  IMonthlyComparison,
  IEmoMindfulness,
  IFeaturedMoment,
  IReminder,
  ICreateReminderDto,
  IRecurringBill,
  ICreateRecurringBillDto,
  IDebtItem,
  ICreateDebtItemDto,
  IDebtSummary,
  IAdminStats,
} from '@monett/shared';

// Xác định địa chỉ Backend phù hợp với thiết bị (Web, Điện thoại qua Expo Go hoặc Mobile Browser)
export const getBaseUrl = (): string => {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // 1. Nếu có cấu hình https (production domain hoặc cloud tunnel) -> ưu tiên dùng ở mọi nơi
  // if (envApiUrl) {
  //   return envApiUrl.replace(/\/$/, '');
  // }

  // 2. Nếu chạy trên Web browser (PC hoặc Mobile Browser)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Chạy trực tiếp trên máy tính dev (localhost / 127.0.0.1)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // Nếu có envApiUrl (tức là đang chạy tunnel) -> dùng envApiUrl
    if (envApiUrl && envApiUrl.startsWith('https://')) {
      return envApiUrl.replace(/\/$/, '');
    }
    // Chạy qua tunnel domain
    if (hostname.includes('ngrok') || hostname.includes('trycloudflare') || hostname.includes('vercel.app') || hostname.includes('loca.lt')) {
      return `${window.location.protocol}//${hostname}`;
    }
    // Mở web qua IP LAN từ thiết bị khác
    return `http://${hostname}:3000`;
  }

  // 3. Nếu chạy Native Mobile App (iOS / Android trong Expo Go)
  try {
    if (envApiUrl && !envApiUrl.includes('localhost') && !envApiUrl.includes('127.0.0.1')) {
      return envApiUrl.replace(/\/$/, '');
    }
    
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
  if (typeof url !== 'string') return undefined;
  const cleanUrl = url.trim();
  if (
    !cleanUrl ||
    cleanUrl === 'null' ||
    cleanUrl === 'undefined' ||
    cleanUrl === 'false' ||
    cleanUrl === '[object Object]' ||
    cleanUrl === 'NaN'
  ) {
    return undefined;
  }

  const base = getBaseUrl();
  // Nếu là relative path
  if (cleanUrl.startsWith('/uploads')) {
    return `${base}${cleanUrl}`;
  }
  if (cleanUrl.startsWith('uploads/')) {
    return `${base}/${cleanUrl}`;
  }
  // Trích xuất path từ URL (VD: từ https://old-ngrok.app/uploads/123.jpg -> /uploads/123.jpg)
  try {
    const urlObj = new URL(cleanUrl);
    if (urlObj.pathname.startsWith('/uploads')) {
      return `${base}${urlObj.pathname}`;
    }
  } catch (e) {
    // Nếu không phải URL hợp lệ mà chỉ là path dạng localhost/uploads/...
    const pathMatch = cleanUrl.match(/(?:\/\/[^\/]+)?(\/uploads\/.*)$/);
    if (pathMatch && pathMatch[1]) {
      return `${base}${pathMatch[1]}`;
    }
  }

  return cleanUrl;
};

const TOKEN_KEY = 'monett_auth_token';
const CURRENT_USER_KEY = 'monett_current_user_profile';
let inMemoryToken: string | null = null;
let inMemoryUser: any | null = null;

export const setStoredUser = (user: any | null) => {
  inMemoryUser = user;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }
};

export const getStoredUser = (): any | null => {
  if (inMemoryUser) return inMemoryUser;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      try {
        inMemoryUser = JSON.parse(raw);
        return inMemoryUser;
      } catch (_) {}
    }
  }
  return null;
};

export const getStoredUserId = (): string => {
  const u = getStoredUser();
  const rawId = u?.id || u?._id || '';
  return rawId ? String(rawId) : 'guest';
};

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setStoredUser(null);
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
  
  const fileResp = await fetch(imageUri);
  const blob = await fileResp.blob();
  formData.append('file', blob, filename);

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

// Cloud Storage & OCR APIs
export const uploadReceiptApi = async (imageUri: string, mimeType: string = 'image/jpeg', filename: string = 'receipt.jpg'): Promise<string> => {
  const token = getAuthToken();
  const url = `${getBaseUrl()}/api/upload`;

  const formData = new FormData();
  
  if (Platform.OS === 'web') {
    const fileResp = await fetch(imageUri);
    const blob = await fileResp.blob();
    formData.append('file', blob, filename || 'receipt.jpg');
  } else {
    const cleanUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
    formData.append('file', {
      uri: cleanUri,
      type: mimeType || 'image/jpeg',
      name: filename || 'receipt.jpg',
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
    throw new Error(json.message || 'Lỗi khi tải ảnh lên máy chủ');
  }
  return normalizeAvatarUrl(json.url) || json.url;
};

export const scanReceiptOcrApi = async (imageUrl: string, apiKey?: string): Promise<any> => {
  try {
    const res = await request<any>('/api/ocr/scan', {
      method: 'POST',
      body: JSON.stringify({ imageUrl, apiKey }),
    });
    return res.data;
  } catch (err: any) {
    console.warn('Backend OCR scan error / no receipt data detected:', err);
    return null;
  }
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
  const fileResp = await fetch(imageUri);
  const blob = await fileResp.blob();
  formData.append('file', blob, filename);

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
  currency?: string;
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
    currency?: string;
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

export const getMomentReactionsApi = async (momentId: string) => {
  const res = await request<any>(`/api/moments/${momentId}/reactions`);
  return res;
};

export const addMomentCommentApi = async (momentId: string, text: string): Promise<any> => {
  const res = await request<any>(`/api/moments/${momentId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return res;
};

export const getMomentCommentsApi = async (momentId: string): Promise<{ momentId: string; comments: any[]; commentsCount: number }> => {
  const res = await request<any>(`/api/moments/${momentId}/comments`);
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data;
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

export const removeFriendApi = async (friendId: string) => {
  const token = getAuthToken();
  const response = await fetch(`${getBaseUrl()}/api/friends/${friendId}`, {
    method: 'DELETE',
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Lỗi xóa bạn bè');
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

export const getTransactionDetailApi = async (id: string) => {
  const res = await request<any>(`/api/transactions/${id}`);
  return (res as any).data || res;
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

// ============================================================
// ANALYTICS & FINANCIAL REPORT APIS
// ============================================================

export const getAnalyticsOverviewApi = async (
  period: AnalyticsPeriod = 'month',
  month?: number,
  year?: number,
): Promise<IAnalyticsOverview> => {
  const params = new URLSearchParams();
  if (period) params.append('period', period);
  if (month) params.append('month', String(month));
  if (year) params.append('year', String(year));

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await request<IAnalyticsOverview>(`/api/analytics/overview${qs}`);
  return (res as any).data || res;
};

export const getAnalyticsDailyTrendApi = async (
  month?: number,
  year?: number,
): Promise<IDailySpendingTrend[]> => {
  const params = new URLSearchParams();
  if (month) params.append('month', String(month));
  if (year) params.append('year', String(year));

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await request<IDailySpendingTrend[]>(`/api/analytics/daily-trend${qs}`);
  return (res as any).data || res;
};

export interface TransactionsByDateResponse {
  date: string;
  totalItems: number;
  totalExpense: number;
  totalIncome: number;
  net: number;
  items: any[];
  photos: {
    id: string;
    photoUri: string;
    title: string;
    amount: number;
    type: string;
    category: string;
    date: string;
  }[];
}

export const getTransactionsByDateApi = async (date?: string): Promise<TransactionsByDateResponse> => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await request<TransactionsByDateResponse>(`/api/transactions/by-date${qs}`);
  return (res as any).data || res;
};

export const getCategoryBreakdownApi = async (
  period: AnalyticsPeriod = 'month',
  month?: number,
  year?: number,
): Promise<ICategoryBreakdown[]> => {
  const params = new URLSearchParams();
  if (period) params.append('period', period);
  if (month) params.append('month', String(month));
  if (year) params.append('year', String(year));

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await request<ICategoryBreakdown[]>(`/api/analytics/category-breakdown${qs}`);
  return (res as any).data || res;
};

export const getAnalyticsCategoriesApi = async (
  month?: number,
  year?: number,
): Promise<ICategoryBreakdown[]> => {
  return getCategoryBreakdownApi('month', month, year);
};

export const getAnalyticsComparisonApi = async (
  month?: number,
  year?: number,
): Promise<IMonthlyComparison> => {
  const params = new URLSearchParams();
  if (month) params.append('month', String(month));
  if (year) params.append('year', String(year));

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await request<IMonthlyComparison>(`/api/analytics/comparison${qs}`);
  return (res as any).data || res;
};

export const getAnalyticsEmotionsApi = async (
  month?: number,
  year?: number,
): Promise<IEmoMindfulness> => {
  const params = new URLSearchParams();
  if (month) params.append('month', String(month));
  if (year) params.append('year', String(year));

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await request<IEmoMindfulness>(`/api/analytics/emotions${qs}`);
  return (res as any).data || res;
};

export const getAnalyticsMomentsApi = async (): Promise<IFeaturedMoment[]> => {
  const res = await request<IFeaturedMoment[]>('/api/analytics/moments');
  return (res as any).data || res;
};

export const getAnalyticsFullReportApi = async (
  period: AnalyticsPeriod = 'month',
  month?: number,
  year?: number,
): Promise<IFullAnalyticsReport> => {
  const params = new URLSearchParams();
  if (period) params.append('period', period);
  if (month) params.append('month', String(month));
  if (year) params.append('year', String(year));

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await request<IFullAnalyticsReport>(`/api/analytics/full-report${qs}`);
  return (res as any).data || res;
};

export const getMessagesApi = async (friendId: string): Promise<any> => {
  const res = await request<any>(`/api/messages/${friendId}`);
  return (res as any).data || res;
};

export const sendMessageApi = async (
  receiverId: string,
  text: string,
  imageUrl?: string,
  type: string = 'text',
  billData?: any,
): Promise<any> => {
  const res = await request<any>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ receiverId, text, imageUrl, type, billData }),
  });
  return (res as any).data || res;
};

// ─── NHÓM TRÒ CHUYỆN (GROUPS API) ───

export const createChatGroupApi = async (name: string, icon: string, memberIds: string[]): Promise<any> => {
  const res = await request<any>('/api/messages/groups', {
    method: 'POST',
    body: JSON.stringify({ name, icon, memberIds }),
  });
  return (res as any).data || res;
};

export const getChatGroupsApi = async (): Promise<any[]> => {
  try {
    const res = await request<any>('/api/messages/groups');
    const data = (res as any)?.data !== undefined ? (res as any).data : res;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

export const sendGroupMessageApi = async (
  groupId: string,
  text: string,
  imageUrl?: string,
  billData?: any,
): Promise<any> => {
  const res = await request<any>(`/api/messages/groups/${groupId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text, imageUrl, billData }),
  });
  return (res as any).data || res;
};

export const getGroupMessagesApi = async (groupId: string): Promise<any[]> => {
  try {
    const res = await request<any>(`/api/messages/groups/${groupId}/messages`);
    const data = (res as any)?.data !== undefined ? (res as any).data : res;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};


// ============================================================
// RECURRING BILLS & DEBTS APIS
// ============================================================

export const getRecurringBillsApi = async (month?: string): Promise<IRecurringBill[]> => {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  const res = await request<any>(`/api/bills-and-debts/bills${qs}`);
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return Array.isArray(data) ? (data as IRecurringBill[]) : [];
};

export const createRecurringBillApi = async (dto: ICreateRecurringBillDto): Promise<IRecurringBill> => {
  const res = await request<any>('/api/bills-and-debts/bills', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IRecurringBill;
};

export const updateRecurringBillApi = async (id: string, dto: Partial<ICreateRecurringBillDto>): Promise<IRecurringBill> => {
  const res = await request<any>(`/api/bills-and-debts/bills/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IRecurringBill;
};

export const toggleBillPaidApi = async (id: string): Promise<IRecurringBill> => {
  const res = await request<any>(`/api/bills-and-debts/bills/${id}/toggle`, {
    method: 'PATCH',
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IRecurringBill;
};

export const deleteRecurringBillApi = async (id: string): Promise<{ success: boolean }> => {
  const res = await request<any>(`/api/bills-and-debts/bills/${id}`, {
    method: 'DELETE',
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as { success: boolean };
};

export const getDebtsApi = async (type?: 'lend' | 'borrow'): Promise<IDebtItem[]> => {
  const qs = type ? `?type=${encodeURIComponent(type)}` : '';
  const res = await request<any>(`/api/bills-and-debts/debts${qs}`);
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return Array.isArray(data) ? (data as IDebtItem[]) : [];
};

export const getDebtSummaryApi = async (): Promise<IDebtSummary> => {
  const res = await request<any>('/api/bills-and-debts/debts/summary');
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IDebtSummary;
};

export const createDebtApi = async (dto: ICreateDebtItemDto): Promise<IDebtItem> => {
  const res = await request<any>('/api/bills-and-debts/debts', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IDebtItem;
};

export const updateDebtApi = async (id: string, dto: Partial<ICreateDebtItemDto>): Promise<IDebtItem> => {
  const res = await request<any>(`/api/bills-and-debts/debts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IDebtItem;
};

export const toggleDebtSettledApi = async (id: string): Promise<IDebtItem> => {
  const res = await request<any>(`/api/bills-and-debts/debts/${id}/toggle`, {
    method: 'PATCH',
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IDebtItem;
};

export const deleteDebtApi = async (id: string): Promise<{ success: boolean }> => {
  const res = await request<any>(`/api/bills-and-debts/debts/${id}`, {
    method: 'DELETE',
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as { success: boolean };
};

// ============================================================
// REMINDERS APIS
// ============================================================

export const getRemindersApi = async (date?: string): Promise<IReminder[]> => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await request<any>(`/api/reminders${qs}`);
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return Array.isArray(data) ? (data as IReminder[]) : [];
};

export const createReminderApi = async (dto: ICreateReminderDto): Promise<IReminder> => {
  const res = await request<any>('/api/reminders', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IReminder;
};

export const updateReminderApi = async (id: string, dto: Partial<ICreateReminderDto>): Promise<IReminder> => {
  const res = await request<any>(`/api/reminders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IReminder;
};

export const toggleReminderApi = async (id: string): Promise<IReminder> => {
  const res = await request<any>(`/api/reminders/${id}/toggle`, {
    method: 'PATCH',
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IReminder;
};

export const deleteReminderApi = async (id: string): Promise<{ success: boolean }> => {
  const res = await request<any>(`/api/reminders/${id}`, {
    method: 'DELETE',
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as { success: boolean };
};

// ============================================================
// ADMIN APIS
// ============================================================

export const getAdminStatsApi = async (): Promise<IAdminStats> => {
  const res = await request<any>('/api/admin/stats');
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IAdminStats;
};

export const getAdminUsersApi = async (params?: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: IUser[]; total: number; page: number; limit: number }> => {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.role) query.append('role', params.role);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request<any>(`/api/admin/users${qs}`);
  const rawData = (res as any)?.data !== undefined ? (res as any).data : res;
  const data = (rawData as any)?.data !== undefined ? rawData.data : rawData;
  const usersList = Array.isArray(data) ? data : (data?.users || []);
  return {
    users: usersList,
    total: typeof data?.total === 'number' ? data.total : usersList.length,
    page: typeof data?.page === 'number' ? data.page : 1,
    limit: typeof data?.limit === 'number' ? data.limit : 50,
  };
};

export const updateUserRoleApi = async (userId: string, role: string): Promise<IUser> => {
  const res = await request<any>(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IUser;
};

export const toggleUserProApi = async (userId: string): Promise<IUser> => {
  const res = await request<any>(`/api/admin/users/${userId}/pro`, {
    method: 'PATCH',
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as IUser;
};

export const deleteUserApi = async (userId: string): Promise<{ success: boolean; message?: string }> => {
  const res = await request<any>(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as { success: boolean; message?: string };
};

export const getAdminTransactionsApi = async (limit = 30): Promise<any[]> => {
  const res = await request<any>(`/api/admin/transactions?limit=${limit}`);
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return Array.isArray(data) ? data : [];
};

export const getAdminMomentsApi = async (limit = 30): Promise<any[]> => {
  const res = await request<any>(`/api/admin/moments?limit=${limit}`);
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return Array.isArray(data) ? data : [];
};

export const deleteAdminMomentApi = async (momentId: string): Promise<{ success: boolean; message?: string }> => {
  const res = await request<any>(`/api/admin/moments/${momentId}`, {
    method: 'DELETE',
  });
  const data = (res as any)?.data !== undefined ? (res as any).data : res;
  return data as { success: boolean; message?: string };
};

// ================= EVENT APIS (SỰ KIỆN & LỜI MỜI) =================
export const getEventsApi = async (): Promise<any[]> => {
  try {
    const res = await request<any>('/api/events');
    const data = (res as any)?.data !== undefined ? (res as any).data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Lỗi gọi getEventsApi:', err);
    return [];
  }
};

export const getEventByIdApi = async (id: string): Promise<any | null> => {
  try {
    const res = await request<any>(`/api/events/${id}`);
    const data = (res as any)?.data !== undefined ? (res as any).data : res;
    return data || null;
  } catch (err) {
    console.warn('Lỗi gọi getEventByIdApi:', err);
    return null;
  }
};

export const createEventApi = async (eventData: any): Promise<any> => {
  const res = await request<any>('/api/events', {
    method: 'POST',
    body: JSON.stringify(eventData),
  });
  return (res as any)?.data !== undefined ? (res as any).data : res;
};

export const updateEventApi = async (id: string, eventData: any): Promise<any> => {
  const res = await request<any>(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(eventData),
  });
  return (res as any)?.data !== undefined ? (res as any).data : res;
};

export const deleteEventApi = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const res = await request<any>(`/api/events/${id}`, {
    method: 'DELETE',
  });
  return (res as any)?.data !== undefined ? (res as any).data : res;
};

export const inviteFriendToEventApi = async (
  eventId: string,
  recipient: { id: string; name: string; email?: string; avatarUrl?: string },
): Promise<{ success: boolean; invite?: any; event?: any }> => {
  const res = await request<any>(`/api/events/${eventId}/invite`, {
    method: 'POST',
    body: JSON.stringify({
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      avatarUrl: recipient.avatarUrl,
    }),
  });
  return (res as any)?.data !== undefined ? (res as any).data : res;
};

export const getPendingEventInvitationsApi = async (): Promise<any[]> => {
  try {
    const res = await request<any>('/api/events/invitations/pending');
    const data = (res as any)?.data !== undefined ? (res as any).data : res;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Lỗi gọi getPendingEventInvitationsApi:', err);
    return [];
  }
};

export const acceptEventInvitationApi = async (inviteId: string): Promise<{ success: boolean; event?: any }> => {
  const res = await request<any>(`/api/events/invitations/${inviteId}/accept`, {
    method: 'POST',
  });
  return (res as any)?.data !== undefined ? (res as any).data : res;
};

export const declineEventInvitationApi = async (inviteId: string): Promise<{ success: boolean }> => {
  const res = await request<any>(`/api/events/invitations/${inviteId}/decline`, {
    method: 'POST',
  });
  return (res as any)?.data !== undefined ? (res as any).data : res;
};


