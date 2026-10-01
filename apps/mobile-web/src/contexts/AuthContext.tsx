import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, UserRole, LoginDto, RegisterDto, GoogleAuthDto } from '@monett/shared';
import {
  getAuthToken,
  setAuthToken,
  loginApi,
  registerApi,
  googleAuthApi,
  getMeApi,
} from '../services/api';

export const MOCK_ADMIN_USER: IUser = {
  id: 'mock_admin_id',
  email: 'admin@monett.vn',
  fullName: 'Quản trị viên (Dev)',
  role: UserRole.ADMIN,
  currency: 'VND',
  isPro: true,
  streak: 30,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  googleLogin: (dto: GoogleAuthDto) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  googleLogin: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Khôi phục phiên đăng nhập khi khởi động app
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = getAuthToken();
      if (savedToken) {
        setTokenState(savedToken);
        if (savedToken === 'mock_admin_token') {
          setUser(MOCK_ADMIN_USER);
          setIsLoading(false);
          return;
        }
        try {
          const profile = await getMeApi();
          setUser(profile);
        } catch (error) {
          console.warn('Phiên đăng nhập hết hạn:', error);
          setAuthToken(null);
          setTokenState(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (dto: LoginDto) => {
    const cleanEmail = dto.email?.trim().toLowerCase();
    // Bypass nhanh cho dev: tài khoản admin và mật khẩu admin
    if ((cleanEmail === 'admin' || cleanEmail === 'admin@monett.vn') && dto.password === 'admin') {
      setAuthToken('mock_admin_token');
      setTokenState('mock_admin_token');
      setUser(MOCK_ADMIN_USER);
      return;
    }

    const res = await loginApi(dto);
    setTokenState(res.accessToken);
    setUser(res.user);
  };

  const register = async (dto: RegisterDto) => {
    const res = await registerApi(dto);
    setTokenState(res.accessToken);
    setUser(res.user);
  };

  const googleLogin = async (dto: GoogleAuthDto) => {
    const res = await googleAuthApi(dto);
    setTokenState(res.accessToken);
    setUser(res.user);
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token === 'mock_admin_token') {
      setUser(MOCK_ADMIN_USER);
      return;
    }
    try {
      const profile = await getMeApi();
      setUser(profile);
    } catch (error) {
      console.warn('Lỗi refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        googleLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
