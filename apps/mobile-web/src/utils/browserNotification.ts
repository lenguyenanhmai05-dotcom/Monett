const STORAGE_KEY_ENABLED = 'monett_browser_notifs_enabled';
const DEFAULT_ICON = 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png';

export type BrowserNotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Kiểm tra xem trình duyệt có hỗ trợ Web Notification API hay không
 */
export const isBrowserNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Lấy trạng thái cấp quyền hiện tại của trình duyệt
 */
export const getBrowserNotificationPermission = (): BrowserNotificationStatus => {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as BrowserNotificationStatus;
};

/**
 * Kiểm tra xem người dùng có đang bật nhận thông báo trình duyệt trong app hay không
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
 * Bật hoặc tắt thiết lập thông báo trình duyệt trong app
 */
export const setBrowserNotificationEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? 'true' : 'false');
    // Dispatch custom event để các component khác đồng bộ ngay
    window.dispatchEvent(new CustomEvent('monett_browser_notif_toggle', { detail: { enabled } }));
  } catch (err) {
    console.warn('Lỗi lưu cài đặt thông báo trình duyệt:', err);
  }
};

/**
 * Yêu cầu quyền gửi thông báo từ người dùng
 */
export const requestBrowserNotificationPermission = async (): Promise<BrowserNotificationStatus> => {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setBrowserNotificationEnabled(true);
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
 * Gửi thông báo trực tiếp ra ngoài màn hình qua Web Notification API
 */
export const sendBrowserNotification = (
  title: string,
  options?: BrowserNotificationOptions
): boolean => {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (!isBrowserNotificationEnabled()) return false;

  try {
    const notif = new Notification(title, {
      body: options?.body || '',
      icon: options?.icon || DEFAULT_ICON,
      badge: options?.badge || DEFAULT_ICON,
      tag: options?.tag || `monett-${Date.now()}`,
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
    console.warn('Lỗi hiển thị Web Notification:', err);
    return false;
  }
};
