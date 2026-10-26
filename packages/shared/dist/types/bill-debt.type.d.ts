export interface IRecurringBill {
    id: string;
    user?: string;
    title: string;
    amount: number;
    dueDay: number;
    remindBeforeDays: number;
    isPaidThisMonth: boolean;
    lastPaidMonth?: string;
    category?: string;
    note?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface ICreateRecurringBillDto {
    title: string;
    amount: number;
    dueDay: number;
    remindBeforeDays?: number;
    category?: string;
    note?: string;
}
export interface IDebtItem {
    id: string;
    user?: string;
    type: 'lend' | 'borrow';
    personName: string;
    amount: number;
    dueDate?: string;
    isSettled: boolean;
    note?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface ICreateDebtItemDto {
    type: 'lend' | 'borrow';
    personName: string;
    amount: number;
    dueDate?: string;
    note?: string;
}
export interface IDebtSummary {
    lendCount: number;
    lendTotal: number;
    borrowCount: number;
    borrowTotal: number;
}
