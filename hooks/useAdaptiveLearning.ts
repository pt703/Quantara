// =============================================================================
// useAdaptiveLearning HOOK
// =============================================================================
// 
// This hook manages the adaptive learning system powered by the Contextual
// Bandit algorithm. It tracks:
// - User's skill levels across financial literacy domains
// - Learning context (streak, time of day, recent performance)
// - Personalized lesson recommendations
// - Reward signals after lesson completion
//
// The system learns from user behavior to provide increasingly personalized
// recommendations over time.
//
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStorage } from './useStorage';
import { 
  SkillProfile, 
  DEFAULT_SKILLS,
  BanditState,
  LearningContext,
  LessonReward,
  AdaptiveRecommendation,
  DifficultyLevel,
  Lesson,
  Course,
  LessonAttemptLog,
  SkillDomain,
} from '../types';
import { 
  ContextualBandit,
  createInitialBanditState,
  getRecommendations,
  updateBanditState,
  updateSkillLevels,
} from '../services/ContextualBandit';
import { courses, getLessonById } from '../mock/courses';

// =============================================================================
// CONSTANTS
// =============================================================================

// Storage keys for persisting adaptive learning data
const SKILLS_STORAGE_KEY = 'quantara_skill_profile';
const BANDIT_STORAGE_KEY = 'quantara_bandit_state';
const COMPLETED_LESSONS_KEY = 'quantara_completed_lessons';
const LESSON_ATTEMPTS_KEY = 'quantara_lesson_attempts';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determines the time of day category for context.
 * This helps the algorithm learn when users perform best.
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';      // 5am - 12pm
  if (hour >= 12 && hour < 17) return 'afternoon';   // 12pm - 5pm
  if (hour >= 17 && hour < 21) return 'evening';     // 5pm - 9pm
  return 'night';                                     // 9pm - 5am
}

/**
 * Counts how many sessions have occurred today.
 * A "session" is defined by a gap of 30+ minutes between activities.
 */
function countTodaySessions(attempts: LessonAttemptLog[]): number {
  const today = new Date().toISOString().split('T')[0];
  
  // Filter to today's attempts
  const todayAttempts = attempts.filter(a => a.startTime.startsWith(today));
  
  if (todayAttempts.length === 0) return 1; // First session of the day
  
  // Count distinct sessions (30+ min gaps)
  let sessions = 1;
  for (let i = 1; i < todayAttempts.length; i++) {
    const prev = new Date(todayAttempts[i - 1].endTime);
    const curr = new Date(todayAttempts[i].startTime);
    const gapMinutes = (curr.getTime() - prev.getTime()) / 1000 / 60;
    
    if (gapMinutes >= 30) {
      sessions++;
    }
  }
  
  return sessions;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Main adaptive learning hook that manages personalized recommendations.
 * 
 * USAGE:
 * ```tsx
 * const {
 *   skills,
 *   recommendations,
 *   completedLessons,
 *   getPersonalizedLessons,
 *   recordLessonAttempt,
 * } = useAdaptiveLearning(streak);
 * ```
 * 
 * @param currentStreak - User's current streak from useGamification
 */
export function useAdaptiveLearning(currentStreak: number = 0) {
  // ==========================================================================
  // PERSISTENT STATE
  // ==========================================================================

  // User's skill levels across domains
  const [skills, setSkills, skillsLoading] = useStorage<SkillProfile>(
    SKILLS_STORAGE_KEY,
    DEFAULT_SKILLS
  );

  // Contextual bandit algorithm state
  const [banditState, setBanditState, banditLoading] = useStorage<BanditState>(
    BANDIT_STORAGE_KEY,
    createInitialBanditState()
  );

  // List of completed lesson IDs
  const [completedLessons, setCompletedLessons, completedLoading] = useStorage<string[]>(
    COMPLETED_LESSONS_KEY,
    []
  );

  // History of all lesson attempts (for research/analytics)
  const [lessonAttempts, setLessonAttempts] = useStorage<LessonAttemptLog[]>(
    LESSON_ATTEMPTS_KEY,
    []
  );

  // ==========================================================================
  // LOCAL STATE
  // ==========================================================================

  // Cached recommendations (updated when context changes)
  const [recommendations, setRecommendations] = useState<AdaptiveRecommendation[]>([]);

  // User's preferred difficulty (can be set by user or inferred)
  const [preferredDifficulty, setPreferredDifficulty] = useState<DifficultyLevel>('beginner');

  // Track last lesson performance for context
  const [lastPerformance, setLastPerformance] = useState<{
    difficulty: DifficultyLevel;
    accuracy: number;
  }>({ difficulty: 'beginner', accuracy: 0.5 });

  // Loading state
  const isLoading = skillsLoading || banditLoading || completedLoading;

  // ==========================================================================
  // CONTEXT BUILDING
  // ==========================================================================

  /**
   * Builds the current learning context for the bandit algorithm.
   * This context influences which lessons are recommended.
   */
  const buildContext = useCallback((): LearningContext => {
    return {
      skillLevels: skills,
      currentStreak: currentStreak,
      timeOfDay: getTimeOfDay(),
      sessionNumber: countTodaySessions(lessonAttempts),
      lastLessonDifficulty: lastPerformance.difficulty,
      lastLessonPerformance: lastPerformance.accuracy,
      preferredDifficulty: preferredDifficulty,
      completedLessonIds: completedLessons,
    };
  }, [skills, currentStreak, lessonAttempts, lastPerformance, preferredDifficulty, completedLessons]);

  // ==========================================================================
  // RECOMMENDATION ENGINE
  // ==========================================================================

  /**
   * Gets available lessons (not yet completed) from all courses.
   */
  const getAvailableLessons = useCallback((): Lesson[] => {
    const available: Lesson[] = [];
    
    for (const course of courses) {
      for (const lesson of course.lessons) {
        // Skip completed lessons
        if (!completedLessons.includes(lesson.id)) {
          available.push(lesson);
        }
      }
    }
    
    return available;
  }, [completedLessons]);

  /**
   * Generates personalized lesson recommendations using the bandit algorithm.
   * Call this to refresh recommendations based on current context.
   */
  const getPersonalizedLessons = useCallback((count: number = 3): AdaptiveRecommendation[] => {
    const context = buildContext();
    const availableLessons = getAvailableLessons();
    
    // Use the contextual bandit to rank lessons
    const recs = getRecommendations(
      context,
      banditState,
      availableLessons,
      courses,
      count
    );
    
    setRecommendations(recs);
    return recs;
  }, [buildContext, getAvailableLessons, banditState]);

  // Auto-refresh recommendations when key state changes
  useEffect(() => {
    if (!isLoading) {
      getPersonalizedLessons();
    }
  }, [isLoading, completedLessons, skills]);

  // ==========================================================================
  // LESSON COMPLETION & REWARD SIGNALS
  // ==========================================================================

  /**
   * Records a lesson attempt and updates the adaptive system.
   * This is the main feedback loop for the bandit algorithm.
   * 
   * @param lessonId - ID of the completed lesson
   * @param accuracy - Percentage correct (0-1)
   * @param timeSpentSeconds - How long the lesson took
   * @param completed - Whether user finished the lesson
   * @param wasRecommended - Whether this was a recommended lesson
   * @param userRating - Optional 1-5 rating from user
   */
  const recordLessonAttempt = useCallback((
    lessonId: string,
    accuracy: number,
    timeSpentSeconds: number,
    completed: boolean,
    wasRecommended: boolean = false,
    userRating?: number
  ): void => {
    // Find the lesson data
    const lessonData = getLessonById(lessonId);
    if (!lessonData) {
      console.warn(`Lesson ${lessonId} not found`);
      return;
    }
    
    const { lesson, course } = lessonData;

    // Build reward signal for bandit
    const reward: LessonReward = {
      lessonId,
      accuracy,
      completionTime: timeSpentSeconds,
      expectedTime: lesson.estimatedMinutes * 60, // Convert to seconds
      completed,
      userRating,
    };

    // Update bandit state with this feedback
    const context = buildContext();
    const newBanditState = updateBanditState(
      banditState,
      lessonId,
      context,
      reward
    );
    setBanditState(newBanditState);

    // Update skill levels based on performance
    const newSkills = updateSkillLevels(
      skills,
      lesson.domain,
      accuracy,
      lesson.difficulty
    );
    setSkills(newSkills);

    // Mark lesson as completed if finished
    if (completed && !completedLessons.includes(lessonId)) {
      setCompletedLessons([...completedLessons, lessonId]);
    }

    // Record attempt for analytics
    const attemptLog: LessonAttemptLog = {
      lessonId,
      courseId: course.id,
      startTime: new Date(Date.now() - timeSpentSeconds * 1000).toISOString(),
      endTime: new Date().toISOString(),
      questionsAttempted: lesson.questions.length,
      questionsCorrect: Math.round(accuracy * lesson.questions.length),
      accuracy,
      heartsLost: 0, // Would be tracked by LessonPlayer
      hintsUsed: 0,  // Future feature
      xpEarned: completed ? lesson.xpReward : 0,
      wasRecommended,
      confidenceRating: userRating,
    };
    setLessonAttempts([...lessonAttempts, attemptLog]);

    // Update last performance for context
    setLastPerformance({
      difficulty: lesson.difficulty,
      accuracy,
    });

    // Refresh recommendations with new context
    setTimeout(() => getPersonalizedLessons(), 100);
  }, [
    banditState, setBanditState,
    skills, setSkills,
    completedLessons, setCompletedLessons,
    lessonAttempts, setLessonAttempts,
    buildContext, getPersonalizedLessons
  ]);

  // ==========================================================================
  // SKILL MANAGEMENT
  // ==========================================================================

  /**
   * Gets the skill level for a specific domain.
   */
  const getSkillLevel = useCallback((domain: SkillDomain): number => {
    return skills[domain] || 50;
  }, [skills]);

  /**
   * Gets all skill levels as an object.
   */
  const getAllSkillLevels = useCallback(() => {
    return {
      budgeting: skills.budgeting,
      saving: skills.saving,
      debt: skills.debt,
      investing: skills.investing,
      credit: skills.credit,
    };
  }, [skills]);

  /**
   * Resets a user's skill to default (for testing).
   */
  const resetSkill = useCallback((domain: SkillDomain): void => {
    setSkills({
      ...skills,
      [domain]: 50,
      lastUpdated: new Date().toISOString(),
    });
  }, [skills, setSkills]);

  /**
   * Resets all skills to default (for testing or new user).
   */
  const resetAllSkills = useCallback((): void => {
    setSkills(DEFAULT_SKILLS);
  }, [setSkills]);

  // ==========================================================================
  // PROGRESS TRACKING
  // ==========================================================================

  /**
   * Gets progress for a specific course.
   */
  const getCourseProgress = useCallback((courseId: string): {
    completed: number;
    total: number;
    percentage: number;
  } => {
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const completed = course.lessons.filter(l => 
      completedLessons.includes(l.id)
    ).length;

    return {
      completed,
      total: course.lessons.length,
      percentage: (completed / course.lessons.length) * 100,
    };
  }, [completedLessons]);

  /**
   * Gets overall progress across all courses.
   */
  const getOverallProgress = useCallback((): {
    lessonsCompleted: number;
    totalLessons: number;
    coursesCompleted: number;
    totalCourses: number;
    percentage: number;
  } => {
    const totalLessons = courses.reduce((sum, c) => sum + c.lessons.length, 0);
    const lessonsCompleted = completedLessons.length;

    const coursesCompleted = courses.filter(course => {
      const progress = getCourseProgress(course.id);
      return progress.percentage === 100;
    }).length;

    return {
      lessonsCompleted,
      totalLessons,
      coursesCompleted,
      totalCourses: courses.length,
      percentage: (lessonsCompleted / totalLessons) * 100,
    };
  }, [completedLessons, getCourseProgress]);

  /**
   * Checks if a specific lesson is completed.
   */
  const isLessonCompleted = useCallback((lessonId: string): boolean => {
    return completedLessons.includes(lessonId);
  }, [completedLessons]);

  /**
   * Gets the next lesson in sequence for a course.
   */
  const getNextLesson = useCallback((courseId: string): Lesson | null => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return null;

    // Find first incomplete lesson
    for (const lesson of course.lessons) {
      if (!completedLessons.includes(lesson.id)) {
        return lesson;
      }
    }

    return null; // Course complete
  }, [completedLessons]);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  // Average skill level
  const averageSkillLevel = useMemo(() => {
    const numericSkills = [
      skills.budgeting,
      skills.saving,
      skills.debt,
      skills.investing,
      skills.credit,
    ];
    return Math.round(
      numericSkills.reduce((a, b) => a + b, 0) / numericSkills.length
    );
  }, [skills]);

  // Weakest skill domain
  const weakestSkill = useMemo((): SkillDomain => {
    const skillEntries: [SkillDomain, number][] = [
      ['budgeting', skills.budgeting],
      ['saving', skills.saving],
      ['debt', skills.debt],
      ['investing', skills.investing],
      ['credit', skills.credit],
    ];
    
    skillEntries.sort((a, b) => a[1] - b[1]);
    return skillEntries[0][0];
  }, [skills]);

  // Strongest skill domain
  const strongestSkill = useMemo((): SkillDomain => {
    const skillEntries: [SkillDomain, number][] = [
      ['budgeting', skills.budgeting],
      ['saving', skills.saving],
      ['debt', skills.debt],
      ['investing', skills.investing],
      ['credit', skills.credit],
    ];
    
    skillEntries.sort((a, b) => b[1] - a[1]);
    return skillEntries[0][0];
  }, [skills]);

  // ==========================================================================
  // RETURN VALUES
  // ==========================================================================

  return {
    // Loading state
    isLoading,

    // Skill data
    skills,
    getSkillLevel,
    getAllSkillLevels,
    averageSkillLevel,
    weakestSkill,
    strongestSkill,
    resetSkill,
    resetAllSkills,

    // Recommendations
    recommendations,
    getPersonalizedLessons,

    // Progress tracking
    completedLessons,
    isLessonCompleted,
    getCourseProgress,
    getOverallProgress,
    getNextLesson,

    // Lesson tracking
    recordLessonAttempt,
    lessonAttempts,

    // Preferences
    preferredDifficulty,
    setPreferredDifficulty,

    // Bandit state (for debugging/research)
    banditState,

    // Course data
    courses,
  };
}

export default useAdaptiveLearning;
