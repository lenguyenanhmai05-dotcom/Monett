export interface PersonalNote {
  id: string;
  userId?: string;
  title: string;
  content: string;
  color: string; // pastel hex
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const NOTE_COLORS = [
  { id: 'yellow', bg: '#FEF9C3', border: '#FDE047', tag: '#CA8A04', nameVi: 'Vàng mật ong', nameEn: 'Honey' },
  { id: 'green', bg: '#DCFCE7', border: '#86EFAC', tag: '#16A34A', nameVi: 'Xanh lá tươi', nameEn: 'Mint' },
  { id: 'purple', bg: '#F3E8FF', border: '#D8B4FE', tag: '#9333EA', nameVi: 'Tím hoa cà', nameEn: 'Lavender' },
  { id: 'blue', bg: '#E0F2FE', border: '#7DD3FC', tag: '#0284C7', nameVi: 'Xanh biển nhạt', nameEn: 'Sky' },
  { id: 'pink', bg: '#FCE7F3', border: '#F9A8D4', tag: '#DB2777', nameVi: 'Hồng phấn', nameEn: 'Rose' },
  { id: 'orange', bg: '#FFEDD5', border: '#FDBA74', tag: '#EA580C', nameVi: 'Cam đào ấm', nameEn: 'Peach' },
];

const INITIAL_NOTES: PersonalNote[] = [
  {
    id: 'note-welcome-1',
    title: '📝 Sổ tay chi tiêu thông minh Monett',
    content: 'Đây là góc ghi chú cá nhân của bạn! Bạn có thể lưu lại danh sách mua sắm, việc cần nhớ, chỉ số điện nước hoặc các mẹo tiết kiệm tiền hữu ích.',
    color: '#FEF9C3',
    isPinned: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-welcome-2',
    title: '🛒 Danh sách đồ cần mua tuần này',
    content: '• Cá hồi & rau xà lách tươi\n• Trứng gà & sữa chua không đường\n• Dầu ô liu & hạt chia\n• Nước giặt sinh học',
    color: '#DCFCE7',
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const STORAGE_KEY_PREFIX = 'monett_personal_notes_';

export const loadNotesFromStorage = (userId?: string): PersonalNote[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return INITIAL_NOTES;
  }
  try {
    const key = STORAGE_KEY_PREFIX + (userId || 'guest');
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc ghi chú:', e);
  }
  return INITIAL_NOTES;
};

export const saveNotesToStorage = (notes: PersonalNote[], userId?: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const key = STORAGE_KEY_PREFIX + (userId || 'guest');
    window.localStorage.setItem(key, JSON.stringify(notes));
  } catch (e) {
    console.warn('Lỗi lưu ghi chú:', e);
  }
};
