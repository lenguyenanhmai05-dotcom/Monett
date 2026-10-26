export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';
export interface IAnalyticsOverview {
    totalIncome: number;
    totalExpense: number;
    savings: number;
    dailyAverage: number;
    savingsPercent: number;
    expensePercent: number;
    savingsTargetDiffPercent: number;
    incomeFixedPercent: number;
    budgetLimit: number;
    isSafe: boolean;
    safetyStatus: 'safe' | 'warning' | 'danger';
    streakDays: number;
    momentsCount: number;
    totalTransactions: number;
    momentsRatio: number;
    periodDisplay?: string;
    banner: {
        streakDays: number;
        title: string;
        subtitle: string;
    };
}
export interface IDailySpendingTrend {
    day: string;
    label: string;
    amount: number;
    benchmark: number;
    highlightTitle?: string;
    isPeak?: boolean;
}
export interface ICategoryBreakdown {
    id: string;
    name: string;
    amount: number;
    percent: number;
    color: string;
    icon?: string;
    count?: number;
}
export interface IMonthlyComparisonItem {
    monthName: string;
    month?: number;
    year?: number;
    amount: number;
    expense?: number;
    income?: number;
    savings?: number;
    netCashflow?: number;
    displayAmount: string;
    displayIncome?: string;
    isCurrent?: boolean;
    deltaPercent?: number;
}
export interface IMonthlyComparison {
    months: IMonthlyComparisonItem[];
    insight: {
        title: string;
        description: string;
        isPositive: boolean;
    };
}
export interface IEmoMindfulnessItem {
    key: 'happy' | 'essential' | 'impulse';
    title: string;
    percent: number;
    amount: number;
    color: string;
    emoji: string;
    description: string;
}
export interface IEmoMindfulness {
    items: IEmoMindfulnessItem[];
    suggestion: string;
}
export interface IFeaturedMoment {
    id: string;
    badge: string;
    badgeColor?: string;
    amount: number;
    title: string;
    subtitle: string;
    photoUri: string;
}
export interface IFullAnalyticsReport {
    period: AnalyticsPeriod;
    month: number;
    year: number;
    dateDisplay: string;
    overview: IAnalyticsOverview;
    dailyTrend: IDailySpendingTrend[];
    categories: ICategoryBreakdown[];
    comparison: IMonthlyComparison;
    emotions: IEmoMindfulness;
    moments: IFeaturedMoment[];
}
