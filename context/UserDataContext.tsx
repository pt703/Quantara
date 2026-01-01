// =============================================================================
// USER DATA CONTEXT
// =============================================================================
// 
// This context provides shared user data (profile and financial) across all
// screens. When data is updated in one screen, all other screens see the
// change immediately because they share the same context state.
//
// This solves the issue where editing finances in one screen wouldn't update
// other screens - now all screens use the same shared state.
//
// =============================================================================

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, FinancialSnapshot } from '../types';

// =============================================================================
// STORAGE KEYS
// =============================================================================

const PROFILE_KEY = 'user_profile';
const FINANCIAL_KEY = 'user_financial';

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_PROFILE: UserProfile = {
  name: 'Nemo',
  avatar: 0,
};

const DEFAULT_FINANCIAL: FinancialSnapshot = {
  monthlyIncome: 0,
  monthlyExpenses: 0,
  totalDebt: 0,
  savingsGoal: 0,
  currentSavings: 0,
  subscriptions: [],
  debtItems: [],
  portfolioAssets: [],
};

// =============================================================================
// CONTEXT TYPE
// =============================================================================

interface UserDataContextType {
  profile: UserProfile;
  setProfile: (value: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  financial: FinancialSnapshot;
  setFinancial: (value: FinancialSnapshot | ((prev: FinancialSnapshot) => FinancialSnapshot)) => void;
  loading: boolean;
  refreshData: () => Promise<void>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface UserDataProviderProps {
  children: ReactNode;
}

export function UserDataProvider({ children }: UserDataProviderProps) {
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);
  const [financial, setFinancialState] = useState<FinancialSnapshot>(DEFAULT_FINANCIAL);
  const [loading, setLoading] = useState(true);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load data from AsyncStorage
  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, financialData] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(FINANCIAL_KEY),
      ]);

      if (profileData) {
        setProfileState(JSON.parse(profileData));
      }
      if (financialData) {
        setFinancialState(JSON.parse(financialData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set profile with persistence
  const setProfile = useCallback(async (value: UserProfile | ((prev: UserProfile) => UserProfile)) => {
    try {
      setProfileState(current => {
        const newValue = value instanceof Function ? value(current) : value;
        AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newValue));
        return newValue;
      });
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }, []);

  // Set financial with persistence
  const setFinancial = useCallback(async (value: FinancialSnapshot | ((prev: FinancialSnapshot) => FinancialSnapshot)) => {
    try {
      setFinancialState(current => {
        const newValue = value instanceof Function ? value(current) : value;
        AsyncStorage.setItem(FINANCIAL_KEY, JSON.stringify(newValue));
        return newValue;
      });
    } catch (error) {
      console.error('Error saving financial:', error);
    }
  }, []);

  // Refresh data from storage (useful after external changes)
  const refreshData = useCallback(async () => {
    await loadData();
  }, []);

  return (
    <UserDataContext.Provider
      value={{
        profile,
        setProfile,
        financial,
        setFinancial,
        loading,
        refreshData,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useUserDataContext() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserDataContext must be used within a UserDataProvider');
  }
  return context;
}

export default UserDataContext;
