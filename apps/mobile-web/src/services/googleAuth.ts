import { Platform } from 'react-native';
import { GoogleAuthDto } from '@monett/shared';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

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

// Kích hoạt Google OAuth trên cả Web và Mobile
export const requestGoogleLogin = async (): Promise<GoogleAuthDto> => {
  // 1. NỀN TẢNG WEB: Sử dụng Google Identity Services (GIS)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
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
              return reject(
                new Error(
                  `Google Auth error: ${tokenResponse.error_description || tokenResponse.error}`,
                ),
              );
            }

            if (!tokenResponse.access_token) {
              return reject(new Error('Không nhận được Access Token từ Google'));
            }

            try {
              const userInfoRes = await fetch(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                {
                  headers: {
                    Authorization: `Bearer ${tokenResponse.access_token}`,
                  },
                },
              );

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

        client.requestAccessToken({ prompt: 'select_account' });
      } catch (err) {
        reject(err);
      }
    });
  }

  // 2. NỀN TẢNG NATIVE MOBILE (iOS / Android trong Expo Go)
  try {
    const proxyRedirectUri = 'https://auth.expo.io/@lenguyenanhmai123/monett-app';
    const returnUrl = AuthSession.getDefaultReturnUrl();

    // Google OAuth URL với redirect_uri trỏ về Expo Auth Proxy đã đăng ký
    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(proxyRedirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&prompt=select_account`;

    // Cầu nối AuthSession Proxy để Safari tự động chuyển tiếp về app qua returnUrl
    const startUrl =
      `${proxyRedirectUri}/start?` +
      `authUrl=${encodeURIComponent(googleAuthUrl)}` +
      `&returnUrl=${encodeURIComponent(returnUrl)}`;

    console.log('[GoogleAuth] Native Mobile opening proxy session:', { startUrl, returnUrl });
    const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
    console.log('[GoogleAuth] Native Mobile result:', JSON.stringify(result));

    if (result.type === 'success' && result.url) {
      let code: string | null = null;
      try {
        const queryIndex = result.url.indexOf('?');
        if (queryIndex !== -1) {
          const queryString = result.url.substring(queryIndex + 1).split('#')[0];
          const searchParams = new URLSearchParams(queryString);
          code = searchParams.get('code');
        }
      } catch (e) {
        console.warn('Parse code error:', e);
      }

      if (code) {
        return {
          code,
          redirectUri: proxyRedirectUri,
        };
      }

      // Fallback: Kiểm tra hash nếu có access_token
      const hashIndex = result.url.indexOf('#');
      if (hashIndex !== -1) {
        const paramsString = result.url.substring(hashIndex + 1);
        const params = new URLSearchParams(paramsString);
        const accessToken = params.get('access_token');

        if (accessToken) {
          const userInfoRes = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );

          if (userInfoRes.ok) {
            const userInfo: GoogleUserInfo = await userInfoRes.json();
            return {
              email: userInfo.email,
              fullName: userInfo.name,
              avatarUrl: userInfo.picture,
              googleId: userInfo.sub,
            };
          }
        }
      }
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Đăng nhập Google đã bị hủy.');
    }
  } catch (nativeErr: any) {
    console.warn('Mobile Google Auth error:', nativeErr);
    throw nativeErr;
  }

  throw new Error('Không nhận được thông tin xác thực từ Google.');
};
