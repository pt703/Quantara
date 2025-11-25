import { useStorage } from './useStorage';
import { UserProfile, FinancialSnapshot } from '../types';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Nemo',
  avatar: 0,
};

const DEFAULT_FINANCIAL: FinancialSnapshot = {
  monthlyIncome: 2500,
  monthlyExpenses: 1800,
  totalDebt: 15000,
  savingsGoal: 5000,
  currentSavings: 1200,
  subscriptions: [
    { id: 'sub-1', name: 'Netflix', cost: 12.99, active: true },
    { id: 'sub-2', name: 'Spotify', cost: 9.99, active: true },
    { id: 'sub-3', name: 'Gym Membership', cost: 45, active: true },
    { id: 'sub-4', name: 'Adobe Creative Cloud', cost: 54.99, active: false },
  ],
};

export function useUserData() {
  const [profile, setProfile, profileLoading] = useStorage<UserProfile>(
    'user_profile',
    DEFAULT_PROFILE
  );

  const [financial, setFinancial, financialLoading] = useStorage<FinancialSnapshot>(
    'user_financial',
    DEFAULT_FINANCIAL
  );

  const loading = profileLoading || financialLoading;

  return {
    profile,
    setProfile,
    financial,
    setFinancial,
    loading,
  };
}
