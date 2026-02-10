import React, { createContext, useContext, useCallback, useEffect, useState, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, FinancialSnapshot } from '../types';
import { syncProfile, syncFinancialSnapshot, fetchProfile, fetchFinancialSnapshot } from '@/services/supabaseDataService';
import { useAuthContext } from '@/context/AuthContext';

const LEGACY_PROFILE_KEY = 'user_profile';
const LEGACY_FINANCIAL_KEY = 'user_financial';
const LEGACY_GLOBAL_STATE_KEYS = [
  '@quantara_bandit_state',
  '@quantara_module_progress',
  '@quantara_wrong_answer_registry',
  '@quantara_skill_accuracy',
  '@quantara/badges',
  '@quantara/badge_stats',
  '@quantara_notification_settings',
  'quantara_gamification_state',
  'quantara_skill_profile',
  'quantara_completed_lessons',
  'quantara_lesson_attempts',
  'quantara_assessed_courses',
  'quantara_baseline_assessments',
];

function getProfileKey(userId: string | null): string {
  return `user_profile:${userId || 'guest'}`;
}

function getFinancialKey(userId: string | null): string {
  return `user_financial:${userId || 'guest'}`;
}

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
  const { user, isLoading: authLoading } = useAuthContext();
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);
  const [financial, setFinancialState] = useState<FinancialSnapshot>(DEFAULT_FINANCIAL);
  const [loading, setLoading] = useState(true);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    loadData(user?.id || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const loadData = async (userId: string | null) => {
    try {
      setLoading(true);
      // Only clear cross-account local state on an actual account switch
      // (e.g., userA -> userB), not on initial app startup restore.
      if (activeUserIdRef.current && activeUserIdRef.current !== userId) {
        if (syncTimerRef.current) {
          clearTimeout(syncTimerRef.current);
          syncTimerRef.current = null;
        }
        await AsyncStorage.multiRemove(LEGACY_GLOBAL_STATE_KEYS);
        setProfileState(DEFAULT_PROFILE);
        setFinancialState(DEFAULT_FINANCIAL);
      }

      const profileKey = getProfileKey(userId);
      const financialKey = getFinancialKey(userId);

      const [profileData, financialData] = await Promise.all([
        AsyncStorage.getItem(profileKey),
        AsyncStorage.getItem(financialKey),
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
          AsyncStorage.setItem(profileKey, JSON.stringify(remoteProfile));
        }
        if (remoteFinancial && !loadedFinancial) {
          loadedFinancial = remoteFinancial;
          AsyncStorage.setItem(financialKey, JSON.stringify(remoteFinancial));
        }
      }

      if (loadedProfile) setProfileState(loadedProfile);
      if (loadedFinancial) setFinancialState(loadedFinancial);
      activeUserIdRef.current = userId;

      // Clean up old unscoped keys so they don't leak across accounts.
      AsyncStorage.multiRemove([LEGACY_PROFILE_KEY, LEGACY_FINANCIAL_KEY]).catch(() => {});
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
        const profileKey = getProfileKey(user?.id || null);
        AsyncStorage.setItem(profileKey, JSON.stringify(newValue));
        debouncedSync(() => syncProfile(newValue));
        return newValue;
      });
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }, [debouncedSync, user?.id]);

  const setFinancial = useCallback(async (value: FinancialSnapshot | ((prev: FinancialSnapshot) => FinancialSnapshot)) => {
    try {
      setFinancialState(current => {
        const newValue = value instanceof Function ? value(current) : value;
        const financialKey = getFinancialKey(user?.id || null);
        AsyncStorage.setItem(financialKey, JSON.stringify(newValue));
        debouncedSync(() => syncFinancialSnapshot(newValue));
        return newValue;
      });
    } catch (error) {
      console.error('Error saving financial:', error);
    }
  }, [debouncedSync, user?.id]);

  const refreshData = useCallback(async () => {
    await loadData(user?.id || null);
  }, [user?.id]);

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
