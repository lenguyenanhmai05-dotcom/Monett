import React from 'react';
import { SavingsScreen } from './SavingsScreen';

interface BudgetScreenProps {
  onNavigateToTab?: (tab: any) => void;
  initialSubTab?: 'savings' | 'budget';
}

export const BudgetScreen: React.FC<BudgetScreenProps> = ({ onNavigateToTab }) => {
  return <SavingsScreen onNavigateToTab={onNavigateToTab} />;
};
