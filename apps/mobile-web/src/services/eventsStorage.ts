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

const INITIAL_EVENTS: MonettEvent[] = [];

export const loadEventsFromStorage = (): MonettEvent[] => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const sampleIds = ['evt-111', 'evt-123', 'evt-birthday-2026'];
          const cleaned = parsed.filter((ev: MonettEvent) => ev && !sampleIds.includes(ev.id));
          if (cleaned.length !== parsed.length) {
            saveEventsToStorage(cleaned);
          }
          return cleaned;
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc sự kiện từ localStorage:', err);
  }
  return [];
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
