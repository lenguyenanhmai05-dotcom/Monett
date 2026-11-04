import { Platform } from 'react-native';
export interface EventExpenseItem {
  id: string;
  title: string;
  amount: number;
  category?: string;
  categoryIcon?: string;
  date: string; // 'dd/mm/yyyy'
  createdAt: string;
  type?: 'expense' | 'income'; // 'expense' = Chi, 'income' = Thu
  payer?: string; // Người thực hiện (VD: Phong Tờ, Mai Linh,...)
  note?: string;
}

export interface EventMember {
  id: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  role: 'owner' | 'member'; // 'owner' = Trưởng nhóm/chủ sự kiện, 'member' = Bạn bè / thành viên
  status?: 'accepted' | 'pending'; // 'pending' = Chờ chấp nhận, 'accepted' = Đã tham gia (mặc định)
  invitedAt?: string;
  joinedAt?: string;
}

export interface MonettEvent {
  id: string;
  title: string; // Tên sự kiện (VD: Du lịch Đà Lạt, 111)
  startDate: string; // '18/10/2026'
  endDate?: string; // '22/10/2026'
  location?: string; // 'Đà Lạt'
  estimatedBudget: number; // Ngân sách dự kiến (VD: 5000000, 1000000)
  description?: string; // Mô tả
  spentAmount: number; // Tổng đã chi
  incomeAmount?: number; // Tổng đã thu
  expenses: EventExpenseItem[];
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: string;
  ownerId?: string; // ID của chủ sự kiện (Owner)
  ownerName?: string; // Tên của Owner (VD: "Phong Tờ")
  members?: EventMember[]; // Danh sách thành viên (owner + bạn bè được mời)
}

const STORAGE_KEY = 'monett_events_v1';

export const REAL_EVENTS_FOR_USER: MonettEvent[] = [
  {
    id: 'evt-dalat-2026',
    title: 'Chuyến du lịch Đà Lạt cùng bạn bè 🌲🍓',
    startDate: '24/10/2026',
    endDate: '28/10/2026',
    location: 'Đà Lạt, Lâm Đồng',
    estimatedBudget: 8500000,
    spentAmount: 5420000,
    description: 'Chuyến đi săn mây đồi Cầu Đất, cafe thung lũng chill ngắm hoàng hôn, ăn lẩu gà lá é Tao Ngộ và bánh tráng nướng chợ đêm.',
    status: 'ongoing',
    createdAt: '2026-10-20T08:00:00.000Z',
    ownerId: 'user_mai_113',
    ownerName: 'Ánh Mai',
    members: [
      { id: 'user_mai_113', name: 'Ánh Mai', email: 'lenguyenanhmai113@gmail.com', role: 'owner' },
    ],
    expenses: [
      {
        id: 'exp-dl-1',
        title: 'Vé xe Limousine khứ hồi Sài Gòn - Đà Lạt',
        amount: 1800000,
        category: 'Đi lại',
        categoryIcon: '🚗',
        date: '24/10/2026',
        createdAt: '2026-10-24T09:00:00.000Z',
        payer: 'Ánh Mai',
        note: 'Đặt vé khứ hồi cho 4 người xe phòng riêng tiện nghi.',
      },
      {
        id: 'exp-dl-2',
        title: 'Homestay Mây Lang Thang (3 đêm)',
        amount: 2400000,
        category: 'Khách sạn',
        categoryIcon: '🏠',
        date: '24/10/2026',
        createdAt: '2026-10-24T14:00:00.000Z',
        payer: 'Ánh Mai',
        note: 'View thung lũng ngắm hoàng hôn cực chill.',
      },
      {
        id: 'exp-dl-3',
        title: 'Lẩu gà lá é Tao Ngộ 3/4',
        amount: 520000,
        category: 'Ăn uống',
        categoryIcon: '🍲',
        date: '25/10/2026',
        createdAt: '2026-10-25T19:30:00.000Z',
        payer: 'Ánh Mai',
        note: 'Nồi lẩu lớn + nấm thêm và nước ngọt.',
      },
      {
        id: 'exp-dl-4',
        title: 'Cafe Túi Mơ To & chụp ảnh',
        amount: 360000,
        category: 'Cafe',
        categoryIcon: '☕',
        date: '26/10/2026',
        createdAt: '2026-10-26T10:00:00.000Z',
        payer: 'Ánh Mai',
        note: '4 phần nước đặc biệt + bánh ngọt.',
      },
      {
        id: 'exp-dl-5',
        title: 'Dâu tây vườn & đặc sản mứt dẻo',
        amount: 340000,
        category: 'Mua sắm',
        categoryIcon: '🍓',
        date: '26/10/2026',
        createdAt: '2026-10-26T15:30:00.000Z',
        payer: 'Ánh Mai',
        note: 'Mua quà mang về.',
      },
    ],
  },
  {
    id: 'evt-birthday-bbq-2026',
    title: 'Tiệc Sinh Nhật & BBQ Cuối Tuần 🎂🎉',
    startDate: '01/11/2026',
    endDate: '01/11/2026',
    location: 'Rooftop Chill Garden, TP. Hồ Chí Minh',
    estimatedBudget: 3500000,
    spentAmount: 1200000,
    description: 'Bữa tiệc sinh nhật tuổi mới ấm cúng cùng bạn bè thân thiết, nướng BBQ và nghe nhạc acoustic nhẹ nhàng.',
    status: 'upcoming',
    createdAt: '2026-10-22T10:00:00.000Z',
    ownerId: 'user_mai_113',
    ownerName: 'Ánh Mai',
    members: [
      { id: 'user_mai_113', name: 'Ánh Mai', email: 'lenguyenanhmai113@gmail.com', role: 'owner' },
    ],
    expenses: [
      {
        id: 'exp-bbq-1',
        title: 'Đặt cọc địa điểm sân thượng & trang trí',
        amount: 1200000,
        category: 'Tiệc tùng',
        categoryIcon: '🎈',
        date: '22/10/2026',
        createdAt: '2026-10-22T11:00:00.000Z',
        payer: 'Ánh Mai',
        note: 'Đã cọc 50% tiền thuê sân vườn.',
      },
    ],
  },
  {
    id: 'evt-cattien-trekking',
    title: 'Cắm trại & Trekking Vườn Quốc Gia Cát Tiên 🏕️🌿',
    startDate: '15/11/2026',
    endDate: '16/11/2026',
    location: 'VQG Cát Tiên, Đồng Nai',
    estimatedBudget: 2800000,
    spentAmount: 650000,
    description: 'Chuyến dã ngoại cuối tuần hòa mình vào thiên nhiên, cắm trại bên bờ sông Đồng Nai và ngắm thú đêm Bàu Sấu.',
    status: 'upcoming',
    createdAt: '2026-10-23T14:00:00.000Z',
    ownerId: 'user_mai_113',
    ownerName: 'Ánh Mai',
    members: [
      { id: 'user_mai_113', name: 'Ánh Mai', email: 'lenguyenanhmai113@gmail.com', role: 'owner' },
    ],
    expenses: [
      {
        id: 'exp-ct-1',
        title: 'Mua lều cắm trại 4 người & túi ngủ',
        amount: 650000,
        category: 'Dã ngoại',
        categoryIcon: '⛺',
        date: '23/10/2026',
        createdAt: '2026-10-23T16:00:00.000Z',
        payer: 'Ánh Mai',
        note: 'Lều chống thấm nước Decathlon.',
      },
    ],
  },
  {
    id: 'evt-phuquoc-summer',
    title: 'Kỳ nghỉ Phú Quốc hè 2026 🏖️🌊',
    startDate: '15/08/2026',
    endDate: '19/08/2026',
    location: 'Phú Quốc, Kiên Giang',
    estimatedBudget: 12000000,
    spentAmount: 11350000,
    description: 'Kỳ nghỉ biển thư giãn, lặn ngắm san hô đảo An Thới, ngắm hoàng hôn Sunset Sanato và thưởng thức hải sản tươi ngon.',
    status: 'completed',
    createdAt: '2026-08-10T09:00:00.000Z',
    ownerId: 'user_mai_113',
    ownerName: 'Ánh Mai',
    members: [
      { id: 'user_mai_113', name: 'Ánh Mai', email: 'lenguyenanhmai113@gmail.com', role: 'owner' },
    ],
    expenses: [
      {
        id: 'exp-pq-1',
        title: 'Vé máy bay khứ hồi Vietjet',
        amount: 4200000,
        category: 'Đi lại',
        categoryIcon: '✈️',
        date: '15/08/2026',
        createdAt: '2026-08-15T07:00:00.000Z',
        payer: 'Ánh Mai',
      },
      {
        id: 'exp-pq-2',
        title: 'Resort Bãi Trường 4N3Đ',
        amount: 4500000,
        category: 'Khách sạn',
        categoryIcon: '🏨',
        date: '15/08/2026',
        createdAt: '2026-08-15T12:00:00.000Z',
        payer: 'Ánh Mai',
      },
      {
        id: 'exp-pq-3',
        title: 'Tour cano 4 đảo & lặn san hô',
        amount: 1600000,
        category: 'Tham quan',
        categoryIcon: '🤿',
        date: '17/08/2026',
        createdAt: '2026-08-17T09:00:00.000Z',
        payer: 'Ánh Mai',
      },
      {
        id: 'exp-pq-4',
        title: 'Hải sản Hàm Ninh & bún quậy Kiến Xây',
        amount: 1050000,
        category: 'Ăn uống',
        categoryIcon: '🦐',
        date: '18/08/2026',
        createdAt: '2026-08-18T19:00:00.000Z',
        payer: 'Ánh Mai',
      },
    ],
  },
];

const STORAGE_PREFIX = '@monett_events_v2_';
export const EVENTS_UPDATED_EVENT = 'monett:events_updated';
const LEGACY_GLOBAL_KEY = 'monett_events_v1';
export const TARGET_EMAIL = 'lenguyenanhmai113@gmail.com';

// 1. In-memory cache đồng bộ để đọc tức thì 0ms trên cả React Native Mobile & Web
const inMemoryCache: Record<string, MonettEvent[]> = {};

// In-memory listeners cho cập nhật chéo giữa các widget và màn hình
const eventsListeners = new Set<() => void>();
let isNotifying = false;

export function notifyEventsUpdated(): void {
  if (isNotifying) return;
  isNotifying = true;
  try {
    eventsListeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        if (typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent(EVENTS_UPDATED_EVENT));
        }
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  } finally {
    isNotifying = false;
  }
}

export function subscribeEventsUpdates(callback: () => void): () => void {
  eventsListeners.add(callback);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const handleEvent = () => {
      try {
        callback();
      } catch {}
    };
    window.addEventListener(EVENTS_UPDATED_EVENT, handleEvent);
    window.addEventListener('storage', handleEvent);
    return () => {
      eventsListeners.delete(callback);
      window.removeEventListener(EVENTS_UPDATED_EVENT, handleEvent);
      window.removeEventListener('storage', handleEvent);
    };
  }
  return () => {
    eventsListeners.delete(callback);
  };
}

export const getEventsStorageKey = (userEmail?: string, userId?: string): string => {
  const emailKey = (userEmail || '').trim().toLowerCase();
  if (emailKey && emailKey !== 'guest') {
    return `${STORAGE_PREFIX}${emailKey}`;
  }
  if (userId && userId.trim() && userId !== 'guest') {
    return `${STORAGE_PREFIX}${userId.trim()}`;
  }
  return `${STORAGE_PREFIX}guest`;
};

// Helper an toàn lấy AsyncStorage
const getAsyncStorage = () => {
  try {
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return null;
  }
};

/**
 * Đọc đồng bộ dữ liệu sự kiện (Ưu tiên Memory Cache -> LocalStorage của ĐÚNG user này)
 * Tuyệt đối không fallback sang guest hay tài khoản người khác!
 */
export const loadEventsFromStorage = (userEmail?: string, userId?: string): MonettEvent[] => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const primaryKey = getEventsStorageKey(normEmail, userId);

  // 1. Kiểm tra trong bộ nhớ đệm (In-Memory Cache) theo đúng primaryKey của user này
  if (inMemoryCache[primaryKey] !== undefined) {
    return inMemoryCache[primaryKey];
  }

  // 2. Thử đọc từ window.localStorage nếu chạy trên Web / Mobile Web
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Dọn dẹp key global rác cũ nếu có
      try {
        window.localStorage.removeItem(LEGACY_GLOBAL_KEY);
        window.localStorage.removeItem(`${STORAGE_PREFIX}global`);
      } catch {}

      const stored = window.localStorage.getItem(primaryKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          inMemoryCache[primaryKey] = parsed;
          return parsed;
        }
      }
    } catch {}
  }

  // 3. Fallback dữ liệu mẫu CHỈ khi là tài khoản demo đặc thù
  if (normEmail === TARGET_EMAIL) {
    inMemoryCache[primaryKey] = REAL_EVENTS_FOR_USER;
    return REAL_EVENTS_FOR_USER;
  }

  // Mọi tài khoản khác: nếu chưa có sự kiện thì trả về mảng rỗng []
  inMemoryCache[primaryKey] = [];
  return [];
};

/**
 * Lưu dữ liệu sự kiện đồng thời vào In-memory cache, AsyncStorage và LocalStorage
 * CHỈ lưu đúng primaryKey của tài khoản đang đăng nhập, tuyệt đối không ghi đè vào guest hay global.
 */
export const saveEventsToStorage = (events: MonettEvent[], userEmail?: string, userId?: string): void => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const primaryKey = getEventsStorageKey(normEmail, userId);
  const jsonStr = JSON.stringify(events);

  // 1. Cập nhật Memory Cache của riêng user này
  inMemoryCache[primaryKey] = events;

  // 2. Lưu vào window.localStorage theo đúng primaryKey
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(primaryKey, jsonStr);
      window.localStorage.removeItem(`${STORAGE_PREFIX}global`);
      window.localStorage.removeItem(LEGACY_GLOBAL_KEY);
    } catch {}
  }

  // 3. Lưu bền vững vào AsyncStorage theo đúng primaryKey
  const asyncStorage = getAsyncStorage();
  if (asyncStorage) {
    try {
      asyncStorage.setItem(primaryKey, jsonStr).catch(() => {});
      asyncStorage.removeItem(`${STORAGE_PREFIX}global`).catch(() => {});
      asyncStorage.removeItem(LEGACY_GLOBAL_KEY).catch(() => {});
    } catch {}
  }

  // 4. Phát tín hiệu cập nhật tức thời
  notifyEventsUpdated();
};

/**
 * Tải trước dữ liệu sự kiện từ AsyncStorage khi app/màn hình mở lên
 * Chỉ đọc đúng key của user này!
 */
export async function preloadEventsFromAsyncStorage(userEmail?: string, userId?: string): Promise<MonettEvent[]> {
  const asyncStorage = getAsyncStorage();
  if (!asyncStorage) return loadEventsFromStorage(userEmail, userId);

  try {
    const normEmail = (userEmail || '').trim().toLowerCase();
    const primaryKey = getEventsStorageKey(normEmail, userId);

    // Dọn dẹp key global cũ trên AsyncStorage
    asyncStorage.removeItem(`${STORAGE_PREFIX}global`).catch(() => {});
    asyncStorage.removeItem(LEGACY_GLOBAL_KEY).catch(() => {});

    const raw = await asyncStorage.getItem(primaryKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemoryCache[primaryKey] = parsed;
          notifyEventsUpdated();
          return parsed;
        }
      } catch {}
    }
  } catch {}

  return loadEventsFromStorage(userEmail, userId);
}

// Khởi chạy nạp ngay khi module được import
preloadEventsFromAsyncStorage().catch(() => {});

export const resetToRealEvents = (userEmail?: string, userId?: string): MonettEvent[] => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  saveEventsToStorage(REAL_EVENTS_FOR_USER, normEmail, userId);
  return REAL_EVENTS_FOR_USER;
};

export function clearUserEventsStorage(userEmail?: string, userId?: string): void {
  const key = getEventsStorageKey(userEmail, userId);
  delete inMemoryCache[key];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }
  const asyncStorage = getAsyncStorage();
  if (asyncStorage) {
    try {
      asyncStorage.removeItem(key).catch(() => {});
    } catch {}
  }
}


function dispatchCustomEventSafely(name: string, detail?: any): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch (_) {}
  }
}

// ================= EVENT INVITATION SYSTEM =================
export interface EventInvitation {
  id: string;
  eventId: string;
  eventTitle: string;
  eventLocation?: string;
  eventStartDate?: string;
  inviterName: string;
  inviterId?: string;
  inviterEmail?: string;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  eventData?: MonettEvent;
}

const INVITATIONS_STORAGE_KEY = '@monett_event_invitations_v1';
let inMemoryInvitationsCache: EventInvitation[] | null = null;

export const getStoredEventInvitations = (): EventInvitation[] => {
  if (inMemoryInvitationsCache && Array.isArray(inMemoryInvitationsCache)) {
    return inMemoryInvitationsCache;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(INVITATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          inMemoryInvitationsCache = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {}
  return [];
};

export const saveStoredEventInvitations = (list: EventInvitation[]): void => {
  inMemoryInvitationsCache = list;
  try {
    const jsonStr = JSON.stringify(list);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(INVITATIONS_STORAGE_KEY, jsonStr);
    }
    const asyncStorage = getAsyncStorage();
    if (asyncStorage) {
      asyncStorage.setItem(INVITATIONS_STORAGE_KEY, jsonStr).catch(() => {});
    }
    dispatchCustomEventSafely('monett:event_invitations_updated', list);
    notifyEventsUpdated();
  } catch (err) {}
};

export const sendEventInvitation = (data: {
  eventId: string;
  eventTitle: string;
  eventLocation?: string;
  eventStartDate?: string;
  inviterName: string;
  inviterId?: string;
  inviterEmail?: string;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  eventData?: MonettEvent;
}): EventInvitation => {
  const invitations = getStoredEventInvitations();
  const newInvite: EventInvitation = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eventId: data.eventId,
    eventTitle: data.eventTitle,
    eventLocation: data.eventLocation,
    eventStartDate: data.eventStartDate,
    inviterName: data.inviterName,
    inviterId: data.inviterId,
    inviterEmail: data.inviterEmail,
    recipientId: data.recipientId,
    recipientName: data.recipientName,
    recipientEmail: data.recipientEmail,
    status: 'pending',
    createdAt: new Date().toISOString(),
    eventData: data.eventData,
  };

  const updated = [newInvite, ...invitations.filter((i) => !(i.eventId === data.eventId && i.recipientId === data.recipientId))];
  saveStoredEventInvitations(updated);

  // Tạo thông báo vào hộp thư thông báo của người nhận
  try {
    const recipientNotifKey = data.recipientId && data.recipientId !== 'guest'
      ? `monett_notifications_${data.recipientId}`
      : 'monett_notifications_guest';

    const notifItem: any = {
      id: `notif-invite-${newInvite.id}`,
      type: 'event',
      title: 'Lời mời tham gia sự kiện 🏕️',
      message: `${data.inviterName} đã mời bạn tham gia sự kiện "${data.eventTitle}". Bạn có muốn tham gia không?`,
      createdAt: new Date().toISOString(),
      read: false,
      iconName: 'calendar',
      iconColor: '#059669',
      iconBg: '#DCFCE7',
      metadata: {
        type: 'event_invite',
        inviteId: newInvite.id,
        eventId: data.eventId,
        eventTitle: data.eventTitle,
        inviterName: data.inviterName,
        inviterId: data.inviterId,
        inviterEmail: data.inviterEmail,
        recipientId: data.recipientId,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        inviteStatus: 'pending',
        targetTab: 'events',
      },
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      const existingNotifsRaw = window.localStorage.getItem(recipientNotifKey);
      let notifs = existingNotifsRaw ? JSON.parse(existingNotifsRaw) : [];
      if (!Array.isArray(notifs)) notifs = [];
      notifs = [notifItem, ...notifs];
      window.localStorage.setItem(recipientNotifKey, JSON.stringify(notifs));
      dispatchCustomEventSafely('monett:notification_added', notifItem);
    }
    const asyncStorage = getAsyncStorage();
    if (asyncStorage) {
      asyncStorage.getItem(recipientNotifKey).then((raw: any) => {
        let notifs = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(notifs)) notifs = [];
        notifs = [notifItem, ...notifs.filter((n: any) => n.id !== notifItem.id)];
        asyncStorage.setItem(recipientNotifKey, JSON.stringify(notifs)).catch(() => {});
      }).catch(() => {});
    }
  } catch (e) {
    console.warn('Lỗi ghi thông báo mời sự kiện:', e);
  }

  notifyEventsUpdated();
  return newInvite;
};

export const getPendingEventInvitationsForUser = (userId?: string, userEmail?: string): EventInvitation[] => {
  const invitations = getStoredEventInvitations();
  const uid = (userId || '').trim().toLowerCase();
  const email = (userEmail || '').trim().toLowerCase();

  return invitations.filter((inv) => {
    if (inv.status !== 'pending') return false;
    const invUid = (inv.recipientId || '').trim().toLowerCase();
    const invEmail = (inv.recipientEmail || '').trim().toLowerCase();
    return (uid && invUid === uid) || (email && invEmail === email);
  });
};

export const acceptEventInvitation = (
  inviteId: string,
  currentUser?: { id?: string; email?: string; fullName?: string }
): MonettEvent | null => {
  const invitations = getStoredEventInvitations();
  const invite = invitations.find((i) => i.id === inviteId);
  if (!invite) return null;

  invite.status = 'accepted';
  saveStoredEventInvitations(invitations);

  const recipientName = currentUser?.fullName || invite.recipientName || 'Bạn bè';
  const recipientEmail = currentUser?.email || invite.recipientEmail || '';
  const recipientId = currentUser?.id || invite.recipientId || '';

  // Lấy sự kiện gốc
  let baseEvent: MonettEvent | undefined = invite.eventData;
  if (!baseEvent) {
    const inviterEvents = loadEventsFromStorage(invite.inviterEmail, invite.inviterId);
    baseEvent = inviterEvents.find((e) => e.id === invite.eventId);
  }

  if (baseEvent) {
    // Cập nhật member trong sự kiện: chuyển status sang accepted
    const updatedMembers: EventMember[] = [...(baseEvent.members || [])];
    const memberIdx = updatedMembers.findIndex(
      (m) =>
        m.id === recipientId ||
        (recipientEmail && m.email === recipientEmail) ||
        m.name.toLowerCase() === recipientName.toLowerCase()
    );

    if (memberIdx >= 0) {
      updatedMembers[memberIdx] = {
        ...updatedMembers[memberIdx],
        status: 'accepted',
        joinedAt: new Date().toLocaleDateString('vi-VN'),
      };
    } else {
      updatedMembers.push({
        id: recipientId || `u-${Date.now()}`,
        name: recipientName,
        email: recipientEmail,
        role: 'member',
        status: 'accepted',
        joinedAt: new Date().toLocaleDateString('vi-VN'),
      });
    }

    const updatedEvent: MonettEvent = {
      ...baseEvent,
      members: updatedMembers,
    };

    // 1. Cập nhật vào kho sự kiện của người mời (Owner)
    if (invite.inviterEmail || invite.inviterId) {
      const inviterEvents = loadEventsFromStorage(invite.inviterEmail, invite.inviterId);
      const newInviterList = inviterEvents.map((e) => (e.id === updatedEvent.id ? updatedEvent : e));
      saveEventsToStorage(newInviterList, invite.inviterEmail, invite.inviterId);
    }

    // 2. Thêm trực tiếp sự kiện này vào danh sách sự kiện của người được mời (Recipient)
    const recipientEvents = loadEventsFromStorage(recipientEmail, recipientId);
    const exists = recipientEvents.some((e) => e.id === updatedEvent.id);
    const newRecipientList = exists
      ? recipientEvents.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
      : [updatedEvent, ...recipientEvents];
    saveEventsToStorage(newRecipientList, recipientEmail, recipientId);

    // Gửi thông báo xác nhận cho người nhận
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const notifKey = recipientId && recipientId !== 'guest' ? `monett_notifications_${recipientId}` : 'monett_notifications_guest';
        const raw = window.localStorage.getItem(notifKey);
        let list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list)) {
          // Đánh dấu thông báo mời thành accepted
          list = list.map((n: any) =>
            n?.metadata?.inviteId === inviteId ? { ...n, metadata: { ...n.metadata, inviteStatus: 'accepted' } } : n
          );
          // Thêm thông báo đã vào sự kiện
          list.unshift({
            id: `notif-joined-${Date.now()}`,
            type: 'event',
            title: 'Đã tham gia sự kiện thành công 🎉',
            message: `Bạn đã chính thức gia nhập sự kiện "${updatedEvent.title}". Bạn có thể xem và cùng lên kế hoạch chi tiêu ngay bây giờ!`,
            createdAt: new Date().toISOString(),
            read: false,
            iconName: 'calendar',
            iconColor: '#059669',
            iconBg: '#DCFCE7',
            metadata: { targetTab: 'events', eventId: updatedEvent.id },
          });
          window.localStorage.setItem(notifKey, JSON.stringify(list));
        }
      }
      const asyncStorage = getAsyncStorage();
      if (asyncStorage) {
        const notifKey = recipientId && recipientId !== 'guest' ? `monett_notifications_${recipientId}` : 'monett_notifications_guest';
        asyncStorage.getItem(notifKey).then((raw: any) => {
          let list = raw ? JSON.parse(raw) : [];
          if (Array.isArray(list)) {
            list = list.map((n) =>
              n?.metadata?.inviteId === inviteId ? { ...n, metadata: { ...n.metadata, inviteStatus: 'accepted' }, read: true } : n
            );
            list.unshift({
              id: `notif-joined-${Date.now()}`,
              type: 'event',
              title: 'Đã tham gia sự kiện thành công 🎉',
              message: `Bạn đã chính thức gia nhập sự kiện "${updatedEvent.title}". Bạn có thể xem và cùng lên kế hoạch chi tiêu ngay bây giờ!`,
              createdAt: new Date().toISOString(),
              read: false,
              iconName: 'calendar',
              iconColor: '#059669',
              iconBg: '#DCFCE7',
              metadata: { targetTab: 'events', eventId: updatedEvent.id },
            });
            asyncStorage.setItem(notifKey, JSON.stringify(list)).catch(() => {});
          }
        }).catch(() => {});

        // Bắn thông báo về cho người mời (Owner)
        if (invite.inviterId && invite.inviterId !== recipientId) {
          const ownerNotifKey = `monett_notifications_${invite.inviterId}`;
          const ownerRaw = window.localStorage.getItem(ownerNotifKey);
          let ownerList = ownerRaw ? JSON.parse(ownerRaw) : [];
          if (Array.isArray(ownerList)) {
            ownerList.unshift({
              id: `notif-accepted-${Date.now()}`,
              type: 'event',
              title: 'Bạn bè đã chấp nhận lời mời 🎉',
              message: `${recipientName} đã đồng ý tham gia sự kiện "${updatedEvent.title}" cùng bạn!`,
              createdAt: new Date().toISOString(),
              read: false,
              iconName: 'people',
              iconColor: '#059669',
              iconBg: '#DCFCE7',
              metadata: { targetTab: 'events', eventId: updatedEvent.id },
            });
            window.localStorage.setItem(ownerNotifKey, JSON.stringify(ownerList));
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi lưu thông báo chấp nhận sự kiện:', e);
    }

    dispatchCustomEventSafely('monett:event_accepted', { event: updatedEvent, recipientId });

    return updatedEvent;
  }

  return null;
};

export const declineEventInvitation = (inviteId: string): void => {
  const invitations = getStoredEventInvitations();
  const invite = invitations.find((i) => i.id === inviteId);
  if (!invite) return;

  invite.status = 'declined';
  saveStoredEventInvitations(invitations);

  // Xoá member pending khỏi sự kiện của người mời
  if (invite.inviterEmail || invite.inviterId) {
    const inviterEvents = loadEventsFromStorage(invite.inviterEmail, invite.inviterId);
    const newInviterList = inviterEvents.map((e) => {
      if (e.id === invite.eventId) {
        return {
          ...e,
          members: (e.members || []).filter(
            (m) => !(m.id === invite.recipientId || (invite.recipientEmail && m.email === invite.recipientEmail))
          ),
        };
      }
      return e;
    });
    saveEventsToStorage(newInviterList, invite.inviterEmail, invite.inviterId);
  }

  // Cập nhật thông báo
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const notifKey = invite.recipientId && invite.recipientId !== 'guest' ? `monett_notifications_${invite.recipientId}` : 'monett_notifications_guest';
      const raw = window.localStorage.getItem(notifKey);
      let list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        list = list.map((n: any) =>
          n?.metadata?.inviteId === inviteId ? { ...n, metadata: { ...n.metadata, inviteStatus: 'declined' } } : n
        );
        window.localStorage.setItem(notifKey, JSON.stringify(list));
      }
    }
    const asyncStorage = getAsyncStorage();
    if (asyncStorage) {
      const notifKey = invite.recipientId && invite.recipientId !== 'guest' ? `monett_notifications_${invite.recipientId}` : 'monett_notifications_guest';
      asyncStorage.getItem(notifKey).then((raw: any) => {
        let list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list)) {
          list = list.map((n) =>
            n?.metadata?.inviteId === inviteId ? { ...n, metadata: { ...n.metadata, inviteStatus: 'declined' }, read: true } : n
          );
          asyncStorage.setItem(notifKey, JSON.stringify(list)).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (e) {
    console.warn(e);
  }

  dispatchCustomEventSafely('monett:event_declined', { inviteId });
  notifyEventsUpdated();
};


// Tải trước danh sách lời mời sự kiện từ AsyncStorage khi khởi động module
(() => {
  const asyncStorage = getAsyncStorage();
  if (asyncStorage) {
    asyncStorage.getItem(INVITATIONS_STORAGE_KEY).then((raw: any) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) inMemoryInvitationsCache = parsed;
        } catch {}
      }
    }).catch(() => {});
  }
})();
