import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BADGES, Badge, BadgeCriteria } from '@/mock/badges';
import { SkillDomain } from '@/types';
import * as Haptics from '@/utils/haptics';

const STORAGE_KEY = '@quantara/badges';
const STATS_KEY = '@quantara/badge_stats';

export interface BadgeStats {
  quizCount: number;
  lessonCount: number;
  perfectQuizCount: number;
  challengeCount: number;
  totalXp: number;
  currentStreak: number;
  hasSavingsGoal: boolean;
  completedDomains: SkillDomain[];
}

export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: string;
}

interface UseBadgesReturn {
  unlockedBadges: UnlockedBadge[];
  allBadges: Badge[];
  stats: BadgeStats;
  isLoading: boolean;
  isBadgeUnlocked: (badgeId: string) => boolean;
  checkAndUnlockBadges: (newStats: Partial<BadgeStats>) => Promise<Badge[]>;
  incrementQuizCount: (isPerfect?: boolean) => Promise<Badge[]>;
  incrementLessonCount: () => Promise<Badge[]>;
  incrementChallengeCount: () => Promise<Badge[]>;
  updateStreak: (streak: number) => Promise<Badge[]>;
  updateTotalXp: (xp: number) => Promise<Badge[]>;
  setSavingsGoal: () => Promise<Badge[]>;
  completeDomain: (domain: SkillDomain) => Promise<Badge[]>;
  recentlyUnlocked: Badge | null;
  clearRecentlyUnlocked: () => void;
}

const DEFAULT_STATS: BadgeStats = {
  quizCount: 0,
  lessonCount: 0,
  perfectQuizCount: 0,
  challengeCount: 0,
  totalXp: 0,
  currentStreak: 0,
  hasSavingsGoal: false,
  completedDomains: [],
};

export function useBadges(): UseBadgesReturn {
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [stats, setStats] = useState<BadgeStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [recentlyUnlocked, setRecentlyUnlocked] = useState<Badge | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [badgesJson, statsJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(STATS_KEY),
      ]);

      if (badgesJson) {
        setUnlockedBadges(JSON.parse(badgesJson));
      }
      if (statsJson) {
        setStats({ ...DEFAULT_STATS, ...JSON.parse(statsJson) });
      }
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (badges: UnlockedBadge[], newStats: BadgeStats) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(badges)),
        AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats)),
      ]);
    } catch (error) {
      console.error('Error saving badges:', error);
    }
  };

  const isBadgeUnlocked = useCallback((badgeId: string): boolean => {
    return unlockedBadges.some(b => b.badgeId === badgeId);
  }, [unlockedBadges]);

  const checkCriteria = useCallback((criteria: BadgeCriteria, currentStats: BadgeStats): boolean => {
    switch (criteria.type) {
      case 'quiz_count':
        return currentStats.quizCount >= criteria.count;
      case 'lesson_count':
        return currentStats.lessonCount >= criteria.count;
      case 'streak_days':
        return currentStats.currentStreak >= criteria.days;
      case 'perfect_quiz':
        return currentStats.perfectQuizCount >= criteria.count;
      case 'domain_complete':
        return currentStats.completedDomains.includes(criteria.domain);
      case 'total_xp':
        return currentStats.totalXp >= criteria.amount;
      case 'savings_goal_set':
        return currentStats.hasSavingsGoal;
      case 'challenge_complete':
        return currentStats.challengeCount >= criteria.count;
      case 'first_login':
        return true;
      default:
        return false;
    }
  }, []);

  const checkAndUnlockBadges = useCallback(async (newStats: Partial<BadgeStats>): Promise<Badge[]> => {
    const updatedStats = { ...stats, ...newStats };
    setStats(updatedStats);

    const newlyUnlocked: Badge[] = [];

    for (const badge of BADGES) {
      if (isBadgeUnlocked(badge.id)) continue;

      if (checkCriteria(badge.criteria, updatedStats)) {
        newlyUnlocked.push(badge);
      }
    }

    if (newlyUnlocked.length > 0) {
      const newUnlockedBadges: UnlockedBadge[] = newlyUnlocked.map(badge => ({
        badgeId: badge.id,
        unlockedAt: new Date().toISOString(),
      }));

      const allUnlocked = [...unlockedBadges, ...newUnlockedBadges];
      setUnlockedBadges(allUnlocked);
      await saveData(allUnlocked, updatedStats);

      Haptics.achievement();
      setRecentlyUnlocked(newlyUnlocked[0]);

      console.log('[BADGES] Unlocked:', newlyUnlocked.map(b => b.name).join(', '));
    } else {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(updatedStats));
    }

    return newlyUnlocked;
  }, [stats, unlockedBadges, isBadgeUnlocked, checkCriteria]);

  const incrementQuizCount = useCallback(async (isPerfect: boolean = false): Promise<Badge[]> => {
    const newStats: Partial<BadgeStats> = {
      quizCount: stats.quizCount + 1,
    };
    if (isPerfect) {
      newStats.perfectQuizCount = stats.perfectQuizCount + 1;
    }
    return checkAndUnlockBadges(newStats);
  }, [stats, checkAndUnlockBadges]);

  const incrementLessonCount = useCallback(async (): Promise<Badge[]> => {
    return checkAndUnlockBadges({ lessonCount: stats.lessonCount + 1 });
  }, [stats, checkAndUnlockBadges]);

  const incrementChallengeCount = useCallback(async (): Promise<Badge[]> => {
    return checkAndUnlockBadges({ challengeCount: stats.challengeCount + 1 });
  }, [stats, checkAndUnlockBadges]);

  const updateStreak = useCallback(async (streak: number): Promise<Badge[]> => {
    if (streak <= stats.currentStreak) return [];
    return checkAndUnlockBadges({ currentStreak: streak });
  }, [stats, checkAndUnlockBadges]);

  const updateTotalXp = useCallback(async (xp: number): Promise<Badge[]> => {
    if (xp <= stats.totalXp) return [];
    return checkAndUnlockBadges({ totalXp: xp });
  }, [stats, checkAndUnlockBadges]);

  const setSavingsGoal = useCallback(async (): Promise<Badge[]> => {
    if (stats.hasSavingsGoal) return [];
    return checkAndUnlockBadges({ hasSavingsGoal: true });
  }, [stats, checkAndUnlockBadges]);

  const completeDomain = useCallback(async (domain: SkillDomain): Promise<Badge[]> => {
    if (stats.completedDomains.includes(domain)) return [];
    return checkAndUnlockBadges({
      completedDomains: [...stats.completedDomains, domain],
    });
  }, [stats, checkAndUnlockBadges]);

  const clearRecentlyUnlocked = useCallback(() => {
    setRecentlyUnlocked(null);
  }, []);

  return {
    unlockedBadges,
    allBadges: BADGES,
    stats,
    isLoading,
    isBadgeUnlocked,
    checkAndUnlockBadges,
    incrementQuizCount,
    incrementLessonCount,
    incrementChallengeCount,
    updateStreak,
    updateTotalXp,
    setSavingsGoal,
    completeDomain,
    recentlyUnlocked,
    clearRecentlyUnlocked,
  };
}
