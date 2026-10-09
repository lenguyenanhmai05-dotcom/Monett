export interface IReminder {
  id: string;
  user?: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  remindBeforeMinutes: number; // 5, 10, 15...
  isCompleted: boolean;
  isDismissed: boolean;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICreateReminderDto {
  title: string;
  date?: string;
  time?: string;
  remindBeforeMinutes?: number;
  note?: string;
}
