// ============================================================
// TRANSACTION TYPES — @monett/shared
// Dùng chung cho cả Frontend Mobile (Expo) và Backend (NestJS)
// ============================================================

export type TransactionType = 'expense' | 'income';

export type TransactionCategory =
  | 'Ăn uống'
  | 'Đồ uống'
  | 'Di chuyển'
  | 'Mua sắm'
  | 'Nhu yếu phẩm'
  | 'Giải trí'
  | 'Sức khỏe'
  | 'Nhà ở'
  | 'Thu nhập phụ'
  | 'Lương'
  | 'Khác';

export interface ITransaction {
  id: string;
  title: string;
  amount: number; // Âm = chi tiêu, Dương = thu nhập
  type: TransactionType;
  category: TransactionCategory | string;
  categoryIcon?: string;
  note?: string;
  photoUri?: string;
  walletId?: string;
  userId?: string;
  date?: string; // ISO date string
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateTransactionDto {
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  note?: string;
  photoUri?: string;
  walletId?: string;
  date?: string;
}

// ============================================================
// BUDGET TYPES
// ============================================================

export interface IBudget {
  id: string;
  userId?: string;
  month: number; // 1-12
  year: number;
  limit: number; // Hạn mức tháng (VNĐ)
  spent: number; // Đã chi trong tháng
  currency?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateBudgetDto {
  month: number;
  year: number;
  limit: number;
  currency?: string;
}

// ============================================================
// WALLET TYPES
// ============================================================

export type WalletType = 'cash' | 'bank' | 'ewallet' | 'savings';

export interface IWallet {
  id: string;
  userId?: string;
  name: string;
  type: WalletType;
  icon?: string;
  balance: number;
  color?: string;
  isDefault?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateWalletDto {
  name: string;
  type: WalletType;
  icon?: string;
  balance: number;
  color?: string;
  isDefault?: boolean;
}
