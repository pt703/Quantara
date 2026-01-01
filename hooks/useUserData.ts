import { useStorage } from './useStorage';
import { UserProfile, FinancialSnapshot } from '../types';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Nemo',
  avatar: 0,
};

// Default financial data - user can edit all of this in Profile
const DEFAULT_FINANCIAL: FinancialSnapshot = {
  monthlyIncome: 0,          // Start empty - user fills in
  monthlyExpenses: 0,        // Start empty - user fills in
  totalDebt: 0,              // Calculated from debtItems
  savingsGoal: 0,            // User sets their target
  currentSavings: 0,         // User tracks this
  subscriptions: [],         // User adds their own
  debtItems: [],             // User adds their debts
  portfolioAssets: [],       // User adds their assets
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
