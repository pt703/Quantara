// =============================================================================
// useGamification HOOK
// =============================================================================
// 
// This hook manages all gamification features in Quantara:
// - Hearts (lives system like Duolingo)
// - XP (experience points)
// - Streaks (consecutive days learning)
// - Levels (based on total XP)
// - Achievements (badges for milestones)
//
// All data persists to AsyncStorage so it survives app restarts.
//
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStorage } from './useStorage';
import { 
  GamificationState, 
  MAX_HEARTS, 
  HEART_REGEN_MINUTES, 
  XP_PER_LEVEL,
  STREAK_XP_BONUS,
  Achievement,
  AchievementCondition,
} from '../types';

// =============================================================================
// CONSTANTS
// =============================================================================

// Storage key for persisting gamification state
const GAMIFICATION_STORAGE_KEY = 'quantara_gamification_state';

// Default state for new users
// NOTE: Users start with 0 hearts and earn them through lesson completion
// This makes hearts feel earned rather than given, encouraging engagement
const DEFAULT_GAMIFICATION_STATE: GamificationState = {
  hearts: 0,                   // Start with no hearts - earn them!
  maxHearts: MAX_HEARTS,
  xp: 0,                       // No XP yet
  level: 1,                    // Start at level 1
  streak: 0,                   // No streak yet - first lesson brings it to 1
  longestStreak: 0,            // Best streak ever achieved
  lastActiveDate: '',          // Will be set on first activity
  heartsLastRefilled: new Date().toISOString(),
  activeDays: [],              // Dates when user was active
};

// Hearts awarded when completing an entire course
const COURSE_COMPLETION_HEARTS = 3;

// Predefined achievements users can unlock
const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    icon: 'award',
    xpReward: 50,
    condition: { type: 'lessons_completed', target: 1 },
  },
  {
    id: 'five_lessons',
    title: 'Getting Started',
    description: 'Complete 5 lessons',
    icon: 'star',
    xpReward: 100,
    condition: { type: 'lessons_completed', target: 5 },
  },
  {
    id: 'ten_lessons',
    title: 'Dedicated Learner',
    description: 'Complete 10 lessons',
    icon: 'book-open',
    xpReward: 200,
    condition: { type: 'lessons_completed', target: 10 },
  },
  {
    id: 'first_course',
    title: 'Course Champion',
    description: 'Complete your first course',
    icon: 'flag',
    xpReward: 500,
    condition: { type: 'courses_completed', target: 1 },
  },
  {
    id: 'streak_3',
    title: 'On Fire',
    description: 'Maintain a 3-day streak',
    icon: 'zap',
    xpReward: 75,
    condition: { type: 'streak', target: 3 },
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: 'trending-up',
    xpReward: 150,
    condition: { type: 'streak', target: 7 },
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: 'shield',
    xpReward: 500,
    condition: { type: 'streak', target: 30 },
  },
  {
    id: 'xp_1000',
    title: 'XP Hunter',
    description: 'Earn 1,000 total XP',
    icon: 'target',
    xpReward: 100,
    condition: { type: 'xp', target: 1000 },
  },
  {
    id: 'perfect_lesson',
    title: 'Perfectionist',
    description: 'Get 100% on a lesson quiz',
    icon: 'check-circle',
    xpReward: 50,
    condition: { type: 'perfect_score', target: 1 },
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculates the user's level based on total XP.
 * Each level requires XP_PER_LEVEL (1000) XP.
 * 
 * @param xp - Total XP earned
 * @returns Current level (1-based)
 */
function calculateLevel(xp: number): number {
  // Level 1 starts at 0 XP, level 2 at 1000, etc.
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/**
 * Gets the XP needed to reach the next level.
 * 
 * @param xp - Current total XP
 * @returns XP remaining until next level
 */
function getXPToNextLevel(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const xpForNextLevel = currentLevel * XP_PER_LEVEL;
  return xpForNextLevel - xp;
}

/**
 * Gets the progress percentage toward the next level.
 * 
 * @param xp - Current total XP
 * @returns Percentage (0-100) toward next level
 */
function getLevelProgress(xp: number): number {
  const xpInCurrentLevel = xp % XP_PER_LEVEL;
  return (xpInCurrentLevel / XP_PER_LEVEL) * 100;
}

/**
 * Checks if two dates are the same calendar day.
 * Used for streak calculations.
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Checks if date1 is exactly one day before date2.
 * Used for streak continuation checks.
 */
function isYesterday(date1: Date, date2: Date): boolean {
  const yesterday = new Date(date2);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date1, yesterday);
}

/**
 * Checks if the given date is within the last 24 hours.
 * Used to determine if streak should be maintained or reset.
 */
function isWithin24Hours(dateStr: string): boolean {
  if (!dateStr) return false;
  const lastActive = new Date(dateStr);
  const now = new Date();
  const hoursDiff = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 24;
}

/**
 * Calculates how many hearts should have regenerated based on time.
 * Hearts regenerate at HEART_REGEN_MINUTES (30) per heart.
 */
function calculateRegeneratedHearts(lastRefillTime: string, currentHearts: number): number {
  const lastRefill = new Date(lastRefillTime);
  const now = new Date();
  const minutesPassed = (now.getTime() - lastRefill.getTime()) / 1000 / 60;
  
  // Calculate how many hearts should have regenerated
  const heartsToRegen = Math.floor(minutesPassed / HEART_REGEN_MINUTES);
  
  // Cap at max hearts
  return Math.min(currentHearts + heartsToRegen, MAX_HEARTS);
}

/**
 * Gets the streak bonus multiplier based on current streak.
 * Longer streaks give bigger XP bonuses.
 */
function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return STREAK_XP_BONUS[30];
  if (streak >= 14) return STREAK_XP_BONUS[14];
  if (streak >= 7) return STREAK_XP_BONUS[7];
  if (streak >= 3) return STREAK_XP_BONUS[3];
  return 1; // No bonus under 3 days
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Main gamification hook that manages hearts, XP, streaks, and achievements.
 * 
 * USAGE:
 * ```tsx
 * const { 
 *   hearts, 
 *   xp, 
 *   streak, 
 *   level,
 *   loseHeart,
 *   gainXP,
 *   updateStreak,
 * } = useGamification();
 * ```
 */
export function useGamification() {
  // Load persisted state from AsyncStorage
  const [storedState, setStoredState, isLoading] = useStorage<GamificationState>(
    GAMIFICATION_STORAGE_KEY,
    DEFAULT_GAMIFICATION_STATE
  );

  // Local state that may differ from stored (e.g., regenerated hearts)
  const [state, setState] = useState<GamificationState>(DEFAULT_GAMIFICATION_STATE);
  
  // Track unlocked achievements
  const [unlockedAchievements, setUnlockedAchievements] = useStorage<string[]>(
    'quantara_achievements',
    []
  );

  // Track various stats for achievement checking
  const [stats, setStats] = useStorage<{
    lessonsCompleted: number;
    coursesCompleted: number;
    perfectScores: number;
  }>('quantara_stats', {
    lessonsCompleted: 0,
    coursesCompleted: 0,
    perfectScores: 0,
  });

  // ==========================================================================
  // INITIALIZATION & HEART REGENERATION
  // ==========================================================================

  // When stored state loads, apply heart regeneration
  useEffect(() => {
    if (!isLoading && storedState) {
      // Calculate regenerated hearts based on time passed
      const regeneratedHearts = calculateRegeneratedHearts(
        storedState.heartsLastRefilled,
        storedState.hearts
      );

      // Update state with regenerated hearts
      const updatedState: GamificationState = {
        ...storedState,
        hearts: regeneratedHearts,
        level: calculateLevel(storedState.xp),
        heartsLastRefilled: regeneratedHearts > storedState.hearts 
          ? new Date().toISOString() 
          : storedState.heartsLastRefilled,
      };

      setState(updatedState);
      
      // Persist if hearts changed
      if (regeneratedHearts !== storedState.hearts) {
        setStoredState(updatedState);
      }
    }
  }, [isLoading, storedState, setStoredState]);

  // ==========================================================================
  // HEART MANAGEMENT
  // ==========================================================================

  /**
   * Decreases hearts by 1 when user answers incorrectly.
   * Returns true if the heart was lost, false if already at 0.
   */
  const loseHeart = useCallback((): boolean => {
    if (state.hearts <= 0) {
      return false; // Can't lose what you don't have
    }

    const newHearts = state.hearts - 1;
    const newState: GamificationState = {
      ...state,
      hearts: newHearts,
    };

    setState(newState);
    setStoredState(newState);
    return true;
  }, [state, setStoredState]);

  /**
   * Adds hearts (e.g., from watching an ad or buying).
   * Capped at MAX_HEARTS.
   */
  const addHearts = useCallback((amount: number): void => {
    const newHearts = Math.min(state.hearts + amount, MAX_HEARTS);
    const newState: GamificationState = {
      ...state,
      hearts: newHearts,
      heartsLastRefilled: new Date().toISOString(),
    };

    setState(newState);
    setStoredState(newState);
  }, [state, setStoredState]);

  /**
   * Awards a heart for completing a lesson successfully.
   * Users earn hearts by learning, not by default.
   * Returns true if a heart was awarded (not at max).
   */
  const earnHeart = useCallback((): boolean => {
    if (state.hearts >= MAX_HEARTS) {
      return false; // Already at max
    }

    const newHearts = state.hearts + 1;
    const newState: GamificationState = {
      ...state,
      hearts: newHearts,
    };

    setState(newState);
    setStoredState(newState);
    return true;
  }, [state, setStoredState]);

  /**
   * Refills hearts to max (e.g., from purchasing or daily reset).
   */
  const refillHearts = useCallback((): void => {
    const newState: GamificationState = {
      ...state,
      hearts: MAX_HEARTS,
      heartsLastRefilled: new Date().toISOString(),
    };

    setState(newState);
    setStoredState(newState);
  }, [state, setStoredState]);

  // ==========================================================================
  // XP MANAGEMENT
  // ==========================================================================

  /**
   * Awards XP to the user. Applies streak bonus automatically.
   * Returns the actual XP gained (after bonus).
   */
  const gainXP = useCallback((baseXP: number): number => {
    // Apply streak bonus multiplier
    const multiplier = getStreakMultiplier(state.streak);
    const actualXP = Math.round(baseXP * multiplier);

    const newTotalXP = state.xp + actualXP;
    const newLevel = calculateLevel(newTotalXP);

    const newState: GamificationState = {
      ...state,
      xp: newTotalXP,
      level: newLevel,
    };

    setState(newState);
    setStoredState(newState);

    return actualXP;
  }, [state, setStoredState]);

  // ==========================================================================
  // STREAK MANAGEMENT
  // ==========================================================================

  /**
   * Updates the streak based on today's activity.
   * Call this when user completes a lesson.
   * 
   * STREAK MECHANICS:
   * - First ever lesson: streak goes from 0 to 1
   * - If same day as last lesson: no change (already counted)
   * - If last lesson was yesterday: increment streak (consecutive day)
   * - If more than 24 hours since last lesson: reset streak to 1
   * 
   * Streak requires completing at least one lesson every 24 hours to maintain.
   */
  const updateStreak = useCallback((): void => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // If already active today, no change needed
    if (state.lastActiveDate === todayStr) {
      return;
    }

    let newStreak: number;

    if (!state.lastActiveDate) {
      // First ever lesson - streak starts at 1
      newStreak = 1;
    } else {
      const lastActive = new Date(state.lastActiveDate);
      
      if (isYesterday(lastActive, today)) {
        // Consecutive day - increment streak!
        newStreak = state.streak + 1;
      } else if (isSameDay(lastActive, today)) {
        // Same day, shouldn't reach here but keep streak
        newStreak = state.streak;
      } else {
        // More than 1 day gap - streak resets to 1 (not 0, since they're doing a lesson now)
        newStreak = 1;
      }
    }

    // Update longest streak if current streak is higher
    const newLongestStreak = Math.max(state.longestStreak || 0, newStreak);

    // Add today to active days (keep last 90 days for weekly chart)
    const existingActiveDays = state.activeDays || [];
    const newActiveDays = existingActiveDays.includes(todayStr)
      ? existingActiveDays
      : [...existingActiveDays, todayStr].slice(-90);

    const newState: GamificationState = {
      ...state,
      streak: newStreak,
      longestStreak: newLongestStreak,
      lastActiveDate: todayStr,
      activeDays: newActiveDays,
    };

    setState(newState);
    setStoredState(newState);
  }, [state, setStoredState]);

  /**
   * Checks if the streak has expired (more than 24 hours without a lesson).
   * Returns true if streak should be considered broken.
   * Used for display purposes to show the user their streak status.
   */
  const isStreakExpired = useCallback((): boolean => {
    if (!state.lastActiveDate || state.streak === 0) {
      return false; // No streak to expire
    }
    return !isWithin24Hours(state.lastActiveDate);
  }, [state.lastActiveDate, state.streak]);

  // ==========================================================================
  // ACHIEVEMENT MANAGEMENT
  // ==========================================================================

  /**
   * Checks if an achievement should be unlocked based on current stats.
   */
  const checkAchievementCondition = useCallback((condition: AchievementCondition): boolean => {
    switch (condition.type) {
      case 'lessons_completed':
        return stats.lessonsCompleted >= condition.target;
      case 'courses_completed':
        return stats.coursesCompleted >= condition.target;
      case 'streak':
        return state.streak >= condition.target;
      case 'xp':
        return state.xp >= condition.target;
      case 'perfect_score':
        return stats.perfectScores >= condition.target;
      default:
        return false;
    }
  }, [stats, state.streak, state.xp]);

  /**
   * Checks and unlocks any newly earned achievements.
   * Returns array of newly unlocked achievements.
   */
  const checkAchievements = useCallback((): Achievement[] => {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      // Skip if already unlocked
      if (unlockedAchievements.includes(achievement.id)) {
        continue;
      }

      // Check if condition is now met
      if (checkAchievementCondition(achievement.condition)) {
        newlyUnlocked.push({
          ...achievement,
          unlockedAt: new Date().toISOString(),
        });
      }
    }

    // If any new achievements, update storage
    if (newlyUnlocked.length > 0) {
      const newUnlockedIds = [
        ...unlockedAchievements,
        ...newlyUnlocked.map(a => a.id),
      ];
      setUnlockedAchievements(newUnlockedIds);

      // Award XP for achievements
      const achievementXP = newlyUnlocked.reduce((sum, a) => sum + a.xpReward, 0);
      if (achievementXP > 0) {
        gainXP(achievementXP);
      }
    }

    return newlyUnlocked;
  }, [unlockedAchievements, setUnlockedAchievements, checkAchievementCondition, gainXP]);

  /**
   * Records a completed lesson and updates stats.
   * Returns any newly unlocked achievements.
   */
  const recordLessonComplete = useCallback((isPerfectScore: boolean = false): Achievement[] => {
    // Update stats
    const newStats = {
      ...stats,
      lessonsCompleted: stats.lessonsCompleted + 1,
      perfectScores: isPerfectScore ? stats.perfectScores + 1 : stats.perfectScores,
    };
    setStats(newStats);

    // Update streak
    updateStreak();

    // Check for new achievements
    return checkAchievements();
  }, [stats, setStats, updateStreak, checkAchievements]);

  /**
   * Records a completed course.
   * Awards 3 bonus hearts for course completion!
   * This is a major reward to celebrate finishing a full course.
   */
  const recordCourseComplete = useCallback((): Achievement[] => {
    const newStats = {
      ...stats,
      coursesCompleted: stats.coursesCompleted + 1,
    };
    setStats(newStats);

    // Award 3 hearts for completing a course - major reward!
    addHearts(COURSE_COMPLETION_HEARTS);

    return checkAchievements();
  }, [stats, setStats, checkAchievements, addHearts]);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  // Calculate derived values
  const levelProgress = useMemo(() => getLevelProgress(state.xp), [state.xp]);
  const xpToNextLevel = useMemo(() => getXPToNextLevel(state.xp), [state.xp]);
  const streakMultiplier = useMemo(() => getStreakMultiplier(state.streak), [state.streak]);
  const hasHearts = state.hearts > 0;

  // Get list of unlocked achievement objects
  const unlockedAchievementsList = useMemo(() => {
    return ACHIEVEMENTS.filter(a => unlockedAchievements.includes(a.id));
  }, [unlockedAchievements]);

  // Get list of locked achievement objects
  const lockedAchievementsList = useMemo(() => {
    return ACHIEVEMENTS.filter(a => !unlockedAchievements.includes(a.id));
  }, [unlockedAchievements]);

  // ==========================================================================
  // RETURN VALUES
  // ==========================================================================

  return {
    // Current state
    hearts: state.hearts,
    maxHearts: MAX_HEARTS,
    xp: state.xp,
    level: state.level,
    streak: state.streak,
    longestStreak: state.longestStreak || 0,
    lastActiveDate: state.lastActiveDate,
    activeDays: state.activeDays || [],
    isLoading,

    // Computed values
    levelProgress,
    xpToNextLevel,
    streakMultiplier,
    hasHearts,

    // Heart actions
    loseHeart,
    addHearts,
    earnHeart,
    refillHearts,

    // XP actions
    gainXP,

    // Streak actions
    updateStreak,
    isStreakExpired,

    // Lesson/Course tracking
    recordLessonComplete,
    recordCourseComplete,

    // Achievement data
    achievements: ACHIEVEMENTS,
    unlockedAchievements: unlockedAchievementsList,
    lockedAchievements: lockedAchievementsList,
    checkAchievements,

    // Stats
    stats,
  };
}

export default useGamification;
