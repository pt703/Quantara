import React, { createContext, useContext, useCallback, useEffect, useState, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, FinancialSnapshot } from '../types';
import { syncProfile, syncFinancialSnapshot, fetchProfile, fetchFinancialSnapshot } from '@/services/supabaseDataService';

const PROFILE_KEY = 'user_profile';
const FINANCIAL_KEY = 'user_financial';

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

interface UserDataContextType {
  profile: UserProfile;
  setProfile: (value: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  financial: FinancialSnapshot;
  setFinancial: (value: FinancialSnapshot | ((prev: FinancialSnapshot) => FinancialSnapshot)) => void;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

interface UserDataProviderProps {
  children: ReactNode;
}

export function UserDataProvider({ children }: UserDataProviderProps) {
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);
  const [financial, setFinancialState] = useState<FinancialSnapshot>(DEFAULT_FINANCIAL);
  const [loading, setLoading] = useState(true);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, financialData] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(FINANCIAL_KEY),
      ]);

      let loadedProfile = profileData ? JSON.parse(profileData) : null;
      let loadedFinancial = financialData ? JSON.parse(financialData) : null;

      if (!loadedProfile || !loadedFinancial) {
        const [remoteProfile, remoteFinancial] = await Promise.all([
          fetchProfile(),
          fetchFinancialSnapshot(),
        ]);

        if (remoteProfile && !loadedProfile) {
          loadedProfile = remoteProfile;
          AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(remoteProfile));
        }
        if (remoteFinancial && !loadedFinancial) {
          loadedFinancial = remoteFinancial;
          AsyncStorage.setItem(FINANCIAL_KEY, JSON.stringify(remoteFinancial));
        }
      }

      if (loadedProfile) setProfileState(loadedProfile);
      if (loadedFinancial) setFinancialState(loadedFinancial);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSync = useCallback((syncFn: () => Promise<boolean>) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncFn().catch(err => console.log('[Sync] Background sync skipped:', err));
    }, 1000);
  }, []);

  const setProfile = useCallback(async (value: UserProfile | ((prev: UserProfile) => UserProfile)) => {
    try {
      setProfileState(current => {
        const newValue = value instanceof Function ? value(current) : value;
        AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newValue));
        debouncedSync(() => syncProfile(newValue));
        return newValue;
      });
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }, [debouncedSync]);

  const setFinancial = useCallback(async (value: FinancialSnapshot | ((prev: FinancialSnapshot) => FinancialSnapshot)) => {
    try {
      setFinancialState(current => {
        const newValue = value instanceof Function ? value(current) : value;
        AsyncStorage.setItem(FINANCIAL_KEY, JSON.stringify(newValue));
        debouncedSync(() => syncFinancialSnapshot(newValue));
        return newValue;
      });
    } catch (error) {
      console.error('Error saving financial:', error);
    }
  }, [debouncedSync]);

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

export function useUserDataContext() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserDataContext must be used within a UserDataProvider');
  }
  return context;
}

export default UserDataContext;
