/**
 * TransactionContext.tsx
 * Quản lý state giao dịch, ngân sách và ví toàn bộ Mobile App.
 * Dùng data local mặc định khi chưa có backend API.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ITransaction, IBudget, IWallet } from '@monett/shared';
import { useAuth } from './AuthContext';

// ============================================================
// DEMO DATA — Hiển thị giao diện ngay khi chưa có API
// ============================================================

const DEMO_TRANSACTIONS: ITransaction[] = [
  {
    id: 'tx-1',
    title: "Pizza 4P's Bến Thành",
    category: 'Ăn uống',
    categoryIcon: '🍕',
    amount: -450000,
    type: 'expense',
    note: 'Ăn trưa cùng nhóm bạn thân',
    photoUri: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-2',
    title: 'Cà phê sáng Highlands',
    category: 'Đồ uống',
    categoryIcon: '☕',
    amount: -65000,
    type: 'expense',
    note: 'Năng lượng chạy deadline',
    photoUri: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-3',
    title: 'GrabCar gặp đối tác',
    category: 'Di chuyển',
    categoryIcon: '🚗',
    amount: -85000,
    type: 'expense',
    note: 'Gặp gỡ khách hàng Quận 1',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-4',
    title: 'Siêu thị WinMart',
    category: 'Nhu yếu phẩm',
    categoryIcon: '🛍️',
    amount: -920000,
    type: 'expense',
    note: 'Mua sắm thực phẩm cho tuần',
    photoUri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-5',
    title: 'Thưởng dự án Freelance',
    category: 'Thu nhập phụ',
    categoryIcon: '💰',
    amount: 1200000,
    type: 'income',
    note: 'Thanh toán hoàn tất thiết kế UI',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-6',
    title: 'Lẩu Haidilao bạn bè',
    category: 'Ăn uống',
    categoryIcon: '🍲',
    amount: -320000,
    type: 'expense',
    note: 'Sinh nhật Minh Anh',
    photoUri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop',
    date: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const DEMO_BUDGET: IBudget = {
  id: 'budget-1',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  limit: 22000000,
  spent: 0,
  currency: 'VND',
};

const DEMO_WALLETS: IWallet[] = [
  {
    id: 'w1',
    name: 'Tiền mặt',
    type: 'cash',
    icon: '💵',
    balance: 2500000,
    color: '#10B981',
    isDefault: true,
  },
  {
    id: 'w2',
    name: 'Ngân hàng (Vietcombank)',
    type: 'bank',
    icon: '🏛️',
    balance: 9950000,
    color: '#0284C7',
  },
  {
    id: 'w3',
    name: 'Ví MoMo',
    type: 'ewallet',
    icon: '📱',
    balance: 3200000,
    color: '#A21CAF',
  },
];

// ============================================================
// CONTEXT TYPES
// ============================================================

interface TransactionContextType {
  transactions: ITransaction[];
  budget: IBudget | null;
  wallets: IWallet[];
  isLoading: boolean;
  totalSpent: number;
  totalIncome: number;
  totalBalance: number;
  remainingBudget: number;
  addTransaction: (tx: Omit<ITransaction, 'id' | 'createdAt'>) => void;
  removeTransaction: (id: string) => void;
  refreshData: () => Promise<void>;
}

// ============================================================
// CONTEXT
// ============================================================

const TransactionContext = createContext<TransactionContextType>({
  transactions: [],
  budget: null,
  wallets: [],
  isLoading: false,
  totalSpent: 0,
  totalIncome: 0,
  totalBalance: 0,
  remainingBudget: 0,
  addTransaction: () => {},
  removeTransaction: () => {},
  refreshData: async () => {},
});

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<ITransaction[]>(DEMO_TRANSACTIONS);
  const [budget, setBudget] = useState<IBudget | null>(DEMO_BUDGET);
  const [wallets, setWallets] = useState<IWallet[]>(DEMO_WALLETS);
  const [isLoading, setIsLoading] = useState(false);

  // Tính toán số liệu tổng hợp
  const totalSpent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  const remainingBudget = budget ? Math.max(0, budget.limit - totalSpent) : 0;

  // Cập nhật spent vào budget khi transactions thay đổi
  useEffect(() => {
    setBudget((prev) =>
      prev ? { ...prev, spent: totalSpent } : prev
    );
  }, [totalSpent]);

  // Thêm giao dịch mới (optimistic update + gọi API sau)
  const addTransaction = useCallback(
    (txData: Omit<ITransaction, 'id' | 'createdAt'>) => {
      const newTx: ITransaction = {
        ...txData,
        id: 'tx-' + Date.now(),
        createdAt: new Date().toISOString(),
        date: txData.date || new Date().toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);

      // TODO: Khi có API — gọi createTransactionApi(newTx) ở đây
      // và cập nhật lại id từ response của server
    },
    []
  );

  const removeTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    // TODO: gọi deleteTransactionApi(id)
  }, []);

  // Tải data từ server (khi có API)
  const refreshData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // TODO: Khi BE có sẵn API:
      // const [txRes, budgetRes, walletRes] = await Promise.all([
      //   getTransactionsApi(),
      //   getBudgetApi(),
      //   getWalletsApi(),
      // ]);
      // setTransactions(txRes.data || DEMO_TRANSACTIONS);
      // setBudget(budgetRes.data || DEMO_BUDGET);
      // setWallets(walletRes.data || DEMO_WALLETS);
    } catch (err) {
      console.warn('[TransactionContext] refreshData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        budget,
        wallets,
        isLoading,
        totalSpent,
        totalIncome,
        totalBalance,
        remainingBudget,
        addTransaction,
        removeTransaction,
        refreshData,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => useContext(TransactionContext);
