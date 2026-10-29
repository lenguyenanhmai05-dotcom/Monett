import { Platform } from 'react-native';

const STORAGE_KEY_ENABLED = 'monett_browser_notifs_enabled';
const DEFAULT_ICON = 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png';

export type BrowserNotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Kiểm tra xem người dùng có đang dùng thiết bị di động (Android / iOS / Tablet)
 */
export const isMobileDevice = (): boolean => {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return Platform.OS !== 'web';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Kiểm tra xem trình duyệt / thiết bị có hỗ trợ Notification API hay không
 */
export const isBrowserNotificationSupported = (): boolean => {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Đăng ký Service Worker để hỗ trợ gửi thông báo trên Chrome Mobile / Android
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('Lỗi đăng ký Monett Service Worker:', err);
    return null;
  }
};

// Tự động khởi tạo Service Worker khi chạy trên web / mobile
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerServiceWorker().catch(() => {});
}

/**
 * Lấy trạng thái cấp quyền hiện tại của trình duyệt / thiết bị
 */
export const getBrowserNotificationPermission = (): BrowserNotificationStatus => {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as BrowserNotificationStatus;
};

/**
 * Kiểm tra xem người dùng có đang bật nhận thông báo trình duyệt / thiết bị trong app hay không
 */
export const isBrowserNotificationEnabled = (): boolean => {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const val = window.localStorage.getItem(STORAGE_KEY_ENABLED);
    // Nếu chưa set mà quyền đã granted thì mặc định là true
    return val !== 'false';
  } catch {
    return false;
  }
};

/**
 * Bật hoặc tắt thiết lập thông báo thiết bị trong app
 */
export const setBrowserNotificationEnabled = (enabled: boolean): void => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    if (window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? 'true' : 'false');
    }
    // Dispatch custom event để các component khác đồng bộ ngay
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('monett_browser_notif_toggle', { detail: { enabled } }));
    }
  } catch (err) {
    console.warn('Lỗi lưu cài đặt thông báo thiết bị:', err);
  }
};

/**
 * Yêu cầu quyền gửi thông báo từ người dùng trên máy tính và điện thoại
 */
export const requestBrowserNotificationPermission = async (): Promise<BrowserNotificationStatus> => {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }

  try {
    // Đảm bảo Service Worker đã sẵn sàng cho mobile
    await registerServiceWorker();

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setBrowserNotificationEnabled(true);

      // Gửi thông báo thử nghiệm ra ngoài thiết bị
      sendBrowserNotification(
        isMobileDevice() ? '📱 Monett: Đã bật thông báo trên điện thoại!' : '🔔 Monett: Đã bật thông báo thiết bị!',
        {
          body: isMobileDevice()
            ? 'Tuyệt vời! Điện thoại sẽ rung & hiển thị thông báo ngay khi đến giờ nhắc nhở hoặc các việc cần làm.'
            : 'Tuyệt vời! Bạn sẽ nhận được thông báo ngoài màn hình ngay cả khi đang chuyển tab khác hoặc ẩn trình duyệt.',
        }
      );
    }
    return permission as BrowserNotificationStatus;
  } catch (err) {
    console.warn('Lỗi yêu cầu quyền thông báo:', err);
    return 'denied';
  }
};

export interface BrowserNotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  badge?: string;
  onClick?: () => void;
  playSound?: boolean;
}

/**
 * Gửi thông báo trực tiếp ra ngoài màn hình điện thoại (Android Notification Drawer) và máy tính (Windows/Mac)
 */
export const sendBrowserNotification = (
  title: string,
  options?: BrowserNotificationOptions
): boolean => {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (!isBrowserNotificationEnabled()) return false;

  const body = options?.body || '';
  const icon = options?.icon || DEFAULT_ICON;
  const badge = options?.badge || DEFAULT_ICON;
  const tag = options?.tag || `monett-${Date.now()}`;

  // 1. Kích hoạt rung điện thoại (Vibrate API) nếu thiết bị hỗ trợ
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([200, 100, 200, 100, 300]);
    } catch {}
  }

  // 2. Fallback trực tiếp bằng Notification constructor (hoạt động tốt trên Desktop Windows/Mac)
  const fallbackDirectNotification = () => {
    try {
      const notif = new Notification(title, {
        body,
        icon,
        badge,
        tag,
      });

      notif.onclick = () => {
        try {
          window.focus();
        } catch {
          // Ignore focus error
        }
        options?.onClick?.();
        notif.close();
      };
      return true;
    } catch (err) {
      console.warn('Fallback Notification constructor không thành công:', err);
      return false;
    }
  };

  // 3. Ưu tiên gửi qua Service Worker (BẮT BUỘC cho Chrome trên Android để hiển thị thanh thông báo hệ thống)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then(async (reg) => {
        let activeReg = reg;
        if (!activeReg) {
          activeReg = (await registerServiceWorker()) || undefined;
        }

        if (activeReg && typeof activeReg.showNotification === 'function') {
          activeReg
            .showNotification(title, {
              body,
              icon,
              badge,
              tag,
              vibrate: [200, 100, 200, 100, 300],
              requireInteraction: true,
              data: {
                url: typeof window !== 'undefined' ? window.location.href : '/',
              },
            } as any)
            .catch((err) => {
              console.warn('activeReg.showNotification error:', err);
              fallbackDirectNotification();
            });
        } else {
          fallbackDirectNotification();
        }
      })
      .catch(() => {
        fallbackDirectNotification();
      });

    return true;
  }

  return fallbackDirectNotification();
};
