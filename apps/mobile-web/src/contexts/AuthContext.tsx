import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, LoginDto, RegisterDto, GoogleAuthDto } from '@monett/shared';
import {
  getAuthToken,
  setAuthToken,
  loginApi,
  registerApi,
  googleAuthApi,
  getMeApi,
} from '../services/api';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  googleLogin: (dto: GoogleAuthDto) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  googleLogin: async () => {},
  logout: () => {},
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
