export class CreateReminderDto {
  title: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  remindBeforeMinutes?: number;
  note?: string;
}

export class UpdateReminderDto {
  title?: string;
  date?: string;
  time?: string;
  remindBeforeMinutes?: number;
  isCompleted?: boolean;
  isDismissed?: boolean;
  note?: string;
}
