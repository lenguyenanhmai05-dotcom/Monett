// Monett Service Worker for Web Push & Mobile System Notifications
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  // Kích hoạt ngay lập tức mà không cần đợi service worker cũ kết thúc
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Chiếm quyền điều khiển toàn bộ clients ngay khi active
  event.waitUntil(self.clients.claim());
});

// Xử lý khi người dùng chạm / bấm vào thông báo trên điện thoại hoặc máy tính
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu đã có tab Monett đang mở, focus vào tab đó
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Nếu chưa có tab nào mở, mở tab mới đến URL ứng dụng
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Xử lý sự kiện Push Notification từ máy chủ (nếu có WebPush)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Monett',
    body: 'Bạn có một nhắc nhở mới!',
    icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Monett', {
      body: payload.body || '',
      icon: payload.icon || 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
      badge: payload.badge || 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
      vibrate: [200, 100, 200, 100, 300],
      requireInteraction: true,
      tag: payload.tag || `monett-${Date.now()}`,
      data: {
        url: payload.url || '/',
      },
    })
  );
});

