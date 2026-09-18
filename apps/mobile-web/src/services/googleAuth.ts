import { Platform } from 'react-native';
import { GoogleAuthDto } from '@monett/shared';

export const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '736231837435-gpto7efhb6refpinmio7b70coi273e5c.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: any;
  }
}

// Tải Google Identity Services (GIS) Web SDK
export const loadGoogleGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return resolve();
    }

    if (window.google?.accounts?.oauth2 || window.google?.accounts?.id) {
      return resolve();
    }

    const existingScript = document.getElementById('google-gsi-client');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

// Kích hoạt Popup Google OAuth (Google Identity Services)
export const requestGoogleLogin = async (): Promise<GoogleAuthDto> => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    throw new Error('Tính năng này chỉ hỗ trợ trên nền tảng Web');
  }

  await loadGoogleGsiScript();

  return new Promise((resolve, reject) => {
    try {
      if (!window.google?.accounts?.oauth2) {
        throw new Error('Không thể tải Google Identity SDK. Vui lòng thử lại!');
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            return reject(new Error(`Google Auth error: ${tokenResponse.error_description || tokenResponse.error}`));
          }

          if (!tokenResponse.access_token) {
            return reject(new Error('Không nhận được Access Token từ Google'));
          }

          try {
            // Lấy thông tin hồ sơ tài khoản Google
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            });

            if (!userInfoRes.ok) {
              throw new Error('Không thể lấy thông tin người dùng từ Google');
            }

            const userInfo: GoogleUserInfo = await userInfoRes.json();

            resolve({
              email: userInfo.email,
              fullName: userInfo.name,
              avatarUrl: userInfo.picture,
              googleId: userInfo.sub,
            });
          } catch (fetchErr: any) {
            reject(fetchErr);
          }
        },
      });

      // Mở Popup đăng nhập tài khoản Google
      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
};
