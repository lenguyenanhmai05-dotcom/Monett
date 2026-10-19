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

const INITIAL_EVENTS: MonettEvent[] = [
  {
    id: 'evt-111',
    title: '111',
    startDate: '18/10/2026',
    endDate: '19/10/2026',
    location: '111',
    estimatedBudget: 1000000,
    description: '',
    spentAmount: 20000,
    incomeAmount: 0,
    status: 'ongoing',
    createdAt: new Date('2026-10-18T08:00:00Z').toISOString(),
    ownerId: 'u-phongto',
    ownerName: 'Phong Tờ',
    members: [
      {
        id: 'u-phongto',
        name: 'Phong Tờ',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        role: 'owner',
        joinedAt: '18/10/2026',
      },
      {
        id: 'u-mailinh',
        name: 'Mai Linh',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
        role: 'member',
        joinedAt: '18/10/2026',
      },
    ],
    expenses: [
      {
        id: 'ee-111-1',
        title: 'Cafe',
        amount: 20000,
        type: 'expense',
        category: 'Cafe',
        categoryIcon: '☕',
        payer: 'Phong Tờ',
        date: '18/10/2026',
        createdAt: new Date('2026-10-18T09:30:00Z').toISOString(),
      },
    ],
  },
  {
    id: 'evt-123',
    title: 'Du lịch Đà Lạt',
    startDate: '18/10/2026',
    endDate: '23/10/2026',
    location: 'Đà Lạt',
    estimatedBudget: 20000000,
    description: 'Chuyến vi vu thành phố sương mù cùng nhóm bạn thân',
    spentAmount: 1850000,
    incomeAmount: 0,
    status: 'ongoing',
    createdAt: new Date('2026-10-18T08:30:00Z').toISOString(),
    ownerId: 'u-phongto',
    ownerName: 'Phong Tờ',
    members: [
      {
        id: 'u-phongto',
        name: 'Phong Tờ',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        role: 'owner',
        joinedAt: '18/10/2026',
      },
      {
        id: 'u-mailinh',
        name: 'Mai Linh',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
        role: 'member',
        joinedAt: '18/10/2026',
      },
      {
        id: 'u-tuananh',
        name: 'Tuấn Anh',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100',
        role: 'member',
        joinedAt: '18/10/2026',
      },
    ],
    expenses: [
      {
        id: 'ee-123-1',
        title: 'Vé xe Limousine khứ hồi',
        amount: 900000,
        type: 'expense',
        category: 'Di chuyển & Xăng',
        categoryIcon: '🛵',
        payer: 'Mai Linh',
        date: '18/10/2026',
        createdAt: new Date('2026-10-18T07:00:00Z').toISOString(),
      },
      {
        id: 'ee-123-2',
        title: 'Tiền cọc Homestay thung lũng',
        amount: 650000,
        type: 'expense',
        category: 'Khách sạn',
        categoryIcon: '🏨',
        payer: 'Phong Tờ',
        date: '18/10/2026',
        createdAt: new Date('2026-10-18T10:30:00Z').toISOString(),
      },
      {
        id: 'ee-123-3',
        title: 'Lẩu gà lá é Tao Ngộ',
        amount: 300000,
        type: 'expense',
        category: 'Ăn uống',
        categoryIcon: '🍜',
        payer: 'Nhóm bạn',
        date: '18/10/2026',
        createdAt: new Date('2026-10-18T19:00:00Z').toISOString(),
      },
    ],
  },
  {
    id: 'evt-birthday-2026',
    title: 'Tiệc sinh nhật ấm cúng 🎂',
    startDate: '28/10/2026',
    endDate: '28/10/2026',
    location: 'Quận 1, TP.HCM',
    estimatedBudget: 2500000,
    description: 'Đặt bàn nhà hàng rooftop ngắm hoàng hôn và chuẩn bị bánh kem kỷ niệm sinh nhật cùng nhóm bạn.',
    spentAmount: 500000,
    incomeAmount: 0,
    status: 'upcoming',
    createdAt: new Date('2026-10-16T10:00:00Z').toISOString(),
    ownerId: 'u-phongto',
    ownerName: 'Phong Tờ',
    members: [
      {
        id: 'u-phongto',
        name: 'Phong Tờ',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        role: 'owner',
        joinedAt: '16/10/2026',
      },
      {
        id: 'u-phuongthao',
        name: 'Phương Thảo',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
        role: 'member',
        joinedAt: '17/10/2026',
      },
    ],
    expenses: [
      {
        id: 'ee-4',
        title: 'Đặt cọc bánh kem Bento',
        amount: 500000,
        type: 'expense',
        category: 'Ăn uống',
        categoryIcon: '🍰',
        payer: 'Tôi',
        date: '17/10/2026',
        createdAt: new Date('2026-10-17T14:00:00Z').toISOString(),
      },
    ],
  },
];

export const loadEventsFromStorage = (): MonettEvent[] => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((ev: MonettEvent) => {
            const ownerName = ev.ownerName || 'Phong Tờ';
            const ownerId = ev.ownerId || 'u-phongto';
            const defaultMembers: EventMember[] = [
              {
                id: ownerId,
                name: ownerName,
                avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
                role: 'owner',
                joinedAt: ev.startDate || '18/10/2026',
              },
              {
                id: 'u-mailinh',
                name: 'Mai Linh',
                avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
                role: 'member',
                joinedAt: ev.startDate || '18/10/2026',
              },
            ];

            return {
              ...ev,
              ownerId,
              ownerName,
              members: ev.members && ev.members.length > 0 ? ev.members : defaultMembers,
            };
          });
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc sự kiện từ localStorage:', err);
  }
  return INITIAL_EVENTS;
};

export const saveEventsToStorage = (events: MonettEvent[]): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }
  } catch (err) {
    console.warn('Lỗi lưu sự kiện vào localStorage:', err);
  }
};
