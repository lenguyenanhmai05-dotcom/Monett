export interface IReminder {
    id: string;
    user?: string;
    title: string;
    date: string;
    time: string;
    remindBeforeMinutes: number;
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
