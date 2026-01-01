// =============================================================================
// CONTEXTUAL BANDIT SERVICE - LinUCB Algorithm for Adaptive Learning
// =============================================================================
// 
// This service implements a Contextual Bandit algorithm using LinUCB (Linear 
// Upper Confidence Bound) to adaptively recommend lessons to users based on
// their learning context and past performance.
//
// WHAT IS A CONTEXTUAL BANDIT?
// ----------------------------
// Imagine you're a teacher with many lessons to choose from. You want to pick
// the best lesson for each student. A contextual bandit helps you:
// 1. Learn which lessons work best for different types of students
// 2. Balance trying new lessons (exploration) vs picking known good ones (exploitation)
// 3. Personalize recommendations based on student context (skill level, preferences)
//
// HOW LinUCB WORKS:
// -----------------
// For each lesson (called an "arm" in bandit terminology):
// 1. We build a model that predicts how well a student will do based on context
// 2. We add an "optimism bonus" to encourage trying less-explored lessons
// 3. We pick the lesson with the highest predicted score + bonus
// 4. After the student completes it, we update our model with their performance
//
// KEY CONCEPTS:
// - Context: Features describing the user (skill level, streak, time of day, etc.)
// - Arm: Each lesson is an "arm" we can pull (recommend)
// - Reward: How well the user did (quiz score, completion, time, satisfaction)
// - Exploration: Trying lessons we're uncertain about to learn more
// - Exploitation: Recommending lessons we know work well for this user type
//
// =============================================================================

import { 
  LearningContext, 
  BanditState, 
  LessonBanditParams, 
  LessonReward,
  AdaptiveRecommendation,
  SkillProfile,
  DifficultyLevel,
  Lesson,
  Course
} from '../types';

// =============================================================================
// CONSTANTS
// =============================================================================

// Alpha controls exploration vs exploitation tradeoff
// Higher alpha = more exploration (trying uncertain lessons)
// Lower alpha = more exploitation (sticking with what works)
// We start with higher alpha for new users, decrease as we learn their preferences
const ALPHA_INITIAL = 2.5;
const ALPHA_MIN = 0.5;
const ALPHA_DECAY = 0.99;  // Multiply alpha by this after each recommendation

// Number of features in our context vector
// Features: 5 skill domains + 1 streak + 1 time_of_day + 1 session + 1 last_difficulty + 1 last_performance
const CONTEXT_DIMENSION = 10;

// Minimum pulls before we trust an arm's estimates
const MIN_PULLS_FOR_CONFIDENCE = 3;

// =============================================================================
// CONTEXT FEATURE EXTRACTION
// =============================================================================

/**
 * Converts a user's learning context into a numerical feature vector.
 * This vector is used by the LinUCB algorithm to predict rewards.
 * 
 * @param context - The user's current learning context
 * @returns An array of numbers representing the context features
 * 
 * FEATURES EXPLAINED:
 * 1-5: Skill levels (0-1 normalized) - How good is the user in each domain?
 * 6: Streak bonus (0-1) - Users with streaks get more challenging content
 * 7: Time of day (0-1) - Morning=0.25, Afternoon=0.5, Evening=0.75, Night=1.0
 * 8: Session number (0-1) - First session vs later sessions
 * 9: Last lesson difficulty (0-1) - beginner=0.33, intermediate=0.66, advanced=1
 * 10: Last performance (0-1) - How well did they do on the previous lesson?
 */
export function extractContextFeatures(context: LearningContext): number[] {
  // Normalize skill levels from 0-100 to 0-1
  const normalizedSkills = [
    context.skillLevels.budgeting / 100,
    context.skillLevels.saving / 100,
    context.skillLevels.debt / 100,
    context.skillLevels.investing / 100,
    context.skillLevels.credit / 100,
  ];

  // Normalize streak (cap at 30 days for normalization)
  const streakNormalized = Math.min(context.currentStreak / 30, 1);

  // Map time of day to numerical value
  const timeOfDayMap: Record<string, number> = {
    morning: 0.25,
    afternoon: 0.5,
    evening: 0.75,
    night: 1.0,
  };
  const timeOfDayNormalized = timeOfDayMap[context.timeOfDay] || 0.5;

  // Normalize session number (cap at 5 sessions per day)
  const sessionNormalized = Math.min(context.sessionNumber / 5, 1);

  // Map difficulty to numerical value
  const difficultyMap: Record<DifficultyLevel, number> = {
    beginner: 0.33,
    intermediate: 0.66,
    advanced: 1.0,
  };
  const lastDifficultyNormalized = difficultyMap[context.lastLessonDifficulty];

  // Last performance is already 0-1
  const lastPerformanceNormalized = context.lastLessonPerformance;

  // Combine all features into a single vector
  return [
    ...normalizedSkills,           // Features 1-5: Skill levels
    streakNormalized,              // Feature 6: Streak
    timeOfDayNormalized,           // Feature 7: Time of day
    sessionNormalized,             // Feature 8: Session number
    lastDifficultyNormalized,      // Feature 9: Last lesson difficulty
    lastPerformanceNormalized,     // Feature 10: Last performance
  ];
}

// =============================================================================
// LESSON FEATURE EXTRACTION
// =============================================================================

/**
 * Extracts features from a lesson to help match it with user context.
 * These features help the algorithm learn which lessons work for which contexts.
 * 
 * @param lesson - The lesson to extract features from
 * @returns An array of numbers representing the lesson features
 */
export function extractLessonFeatures(lesson: Lesson): number[] {
  // Map domain to skill index (which of the 5 skills does this lesson target?)
  const domainToIndex: Record<string, number> = {
    budgeting: 0,
    saving: 1,
    debt: 2,
    investing: 3,
    credit: 4,
  };

  // Create a one-hot encoding for the domain (1 in the relevant position, 0 elsewhere)
  const domainVector = [0, 0, 0, 0, 0];
  const domainIndex = domainToIndex[lesson.domain] ?? 0;
  domainVector[domainIndex] = 1;

  // Map difficulty to numerical value
  const difficultyMap: Record<DifficultyLevel, number> = {
    beginner: 0.33,
    intermediate: 0.66,
    advanced: 1.0,
  };
  const difficultyValue = difficultyMap[lesson.difficulty];

  // Normalize estimated time (cap at 20 minutes)
  const timeNormalized = Math.min(lesson.estimatedMinutes / 20, 1);

  // Normalize XP reward (cap at 200)
  const xpNormalized = Math.min(lesson.xpReward / 200, 1);

  // Number of questions (more questions = more engagement, cap at 15)
  const questionCountNormalized = Math.min(lesson.questions.length / 15, 1);

  return [
    ...domainVector,               // Features 1-5: Which domain
    difficultyValue,               // Feature 6: Difficulty
    timeNormalized,                // Feature 7: Estimated time
    xpNormalized,                  // Feature 8: XP reward
    questionCountNormalized,       // Feature 9: Question count
    0.5,                           // Feature 10: Padding for dimension match
  ];
}

// =============================================================================
// BANDIT STATE MANAGEMENT
// =============================================================================

/**
 * Creates the initial state for a new bandit algorithm.
 * Called when a user first starts using the app.
 * 
 * @returns A fresh BanditState with no learned parameters
 */
export function createInitialBanditState(): BanditState {
  return {
    lessonParams: {},
    totalPulls: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Initializes parameters for a new lesson (arm) in the bandit.
 * Called when we encounter a lesson the user hasn't seen before.
 * 
 * @param lessonId - The ID of the lesson to initialize
 * @returns Fresh parameters for this lesson
 */
export function initializeLessonParams(lessonId: string): LessonBanditParams {
  return {
    lessonId,
    pullCount: 0,                              // Never recommended yet
    rewardSum: 0,                              // No rewards collected
    averageReward: 0.5,                        // Optimistic initial estimate
    theta: new Array(CONTEXT_DIMENSION).fill(0), // Zero weight vector
    confidence: 1.0,                           // High initial confidence bound
  };
}

// =============================================================================
// LinUCB CORE ALGORITHM
// =============================================================================

/**
 * Computes the UCB (Upper Confidence Bound) score for a lesson.
 * This score balances expected reward with exploration bonus.
 * 
 * Formula: UCB = estimated_reward + alpha * confidence_bound
 * 
 * The confidence bound is higher for:
 * - Lessons we haven't tried much (exploration)
 * - Lessons where context matches our model's strengths
 * 
 * @param lessonParams - The stored parameters for this lesson
 * @param contextFeatures - The current user's context as a feature vector
 * @param alpha - The exploration parameter (higher = more exploration)
 * @returns The UCB score for this lesson
 */
export function computeUCBScore(
  lessonParams: LessonBanditParams,
  contextFeatures: number[],
  alpha: number
): number {
  // If we haven't tried this lesson much, give it a high score to encourage exploration
  if (lessonParams.pullCount < MIN_PULLS_FOR_CONFIDENCE) {
    // Return optimistic score plus exploration bonus
    return 0.7 + alpha * (1 / (lessonParams.pullCount + 1));
  }

  // Compute the predicted reward using our learned weights
  // This is a simple linear model: reward = sum(theta[i] * context[i])
  let predictedReward = 0;
  for (let i = 0; i < CONTEXT_DIMENSION; i++) {
    predictedReward += (lessonParams.theta[i] || 0) * (contextFeatures[i] || 0);
  }

  // Add the average reward as a baseline
  predictedReward = (predictedReward + lessonParams.averageReward) / 2;

  // Clamp to valid range [0, 1]
  predictedReward = Math.max(0, Math.min(1, predictedReward));

  // Compute confidence bound (decreases with more observations)
  // sqrt(log(n) / count) is a standard UCB formula component
  const logN = Math.log(lessonParams.pullCount + 1);
  const confidenceBound = Math.sqrt(logN / (lessonParams.pullCount + 1));

  // Final UCB score = predicted reward + exploration bonus
  return predictedReward + alpha * confidenceBound;
}

/**
 * Updates the lesson parameters after observing a reward.
 * This is how the algorithm learns from user feedback.
 * 
 * @param params - Current parameters for the lesson
 * @param contextFeatures - The context when the lesson was taken
 * @param reward - The observed reward (0-1, higher = better performance)
 * @returns Updated parameters for the lesson
 */
export function updateLessonParams(
  params: LessonBanditParams,
  contextFeatures: number[],
  reward: number
): LessonBanditParams {
  // Increment pull count
  const newPullCount = params.pullCount + 1;

  // Update reward sum and average
  const newRewardSum = params.rewardSum + reward;
  const newAverageReward = newRewardSum / newPullCount;

  // Update weight vector using gradient descent
  // Learning rate decreases with more observations (1/sqrt(n))
  const learningRate = 1 / Math.sqrt(newPullCount);

  // Compute prediction error
  let prediction = 0;
  for (let i = 0; i < CONTEXT_DIMENSION; i++) {
    prediction += (params.theta[i] || 0) * (contextFeatures[i] || 0);
  }
  const error = reward - prediction;

  // Update weights: theta[i] += learningRate * error * context[i]
  const newTheta = params.theta.map((weight, i) => {
    const contextValue = contextFeatures[i] || 0;
    return weight + learningRate * error * contextValue;
  });

  // Update confidence (decreases as we get more data)
  const newConfidence = Math.sqrt(Math.log(newPullCount + 1) / (newPullCount + 1));

  return {
    lessonId: params.lessonId,
    pullCount: newPullCount,
    rewardSum: newRewardSum,
    averageReward: newAverageReward,
    theta: newTheta,
    confidence: newConfidence,
  };
}

// =============================================================================
// REWARD COMPUTATION
// =============================================================================

/**
 * Computes a reward signal from lesson completion data.
 * This reward is used to update the bandit algorithm.
 * 
 * A good reward signal should capture:
 * - How well the user understood the material (accuracy)
 * - How engaged the user was (completion, time spent)
 * - User satisfaction (optional rating)
 * 
 * @param lessonReward - Data about how the user performed
 * @returns A reward value between 0 and 1
 */
export function computeReward(lessonReward: LessonReward): number {
  // Start with accuracy as the base reward (most important signal)
  // Accuracy is already 0-1
  let reward = lessonReward.accuracy;

  // Completion bonus: +0.1 if they finished the lesson
  if (lessonReward.completed) {
    reward += 0.1;
  } else {
    // Penalty for not completing: -0.2
    reward -= 0.2;
  }

  // Time efficiency bonus/penalty
  // If they took much longer than expected, slight penalty
  // If they finished faster with good accuracy, slight bonus
  const timeRatio = lessonReward.completionTime / (lessonReward.expectedTime * 60);
  if (timeRatio < 0.5 && lessonReward.accuracy >= 0.8) {
    // Fast and accurate = bonus
    reward += 0.1;
  } else if (timeRatio > 2.0) {
    // Very slow = slight penalty (might indicate struggle)
    reward -= 0.1;
  }

  // User rating bonus (if provided)
  // Rating is 1-5, we convert to -0.2 to +0.2 bonus
  if (lessonReward.userRating !== undefined) {
    const ratingBonus = (lessonReward.userRating - 3) * 0.1; // 1=-0.2, 3=0, 5=+0.2
    reward += ratingBonus;
  }

  // Clamp final reward to [0, 1]
  return Math.max(0, Math.min(1, reward));
}

// =============================================================================
// MAIN RECOMMENDATION ENGINE
// =============================================================================

/**
 * The main recommendation function that picks the best lessons for a user.
 * Uses LinUCB to balance exploration and exploitation.
 * 
 * @param context - The user's current learning context
 * @param banditState - The current state of the bandit algorithm
 * @param availableLessons - All lessons the user could take (not completed)
 * @param courses - All courses for lesson metadata
 * @param numRecommendations - How many recommendations to return (default 3)
 * @returns Array of recommendations sorted by score
 */
export function getRecommendations(
  context: LearningContext,
  banditState: BanditState,
  availableLessons: Lesson[],
  courses: Course[],
  numRecommendations: number = 3
): AdaptiveRecommendation[] {
  // If no lessons available, return empty array
  if (availableLessons.length === 0) {
    return [];
  }

  // Extract context features
  const contextFeatures = extractContextFeatures(context);

  // Calculate current alpha (exploration parameter)
  // Decreases as user completes more lessons, shifting from exploration to exploitation
  const alpha = Math.max(
    ALPHA_MIN,
    ALPHA_INITIAL * Math.pow(ALPHA_DECAY, banditState.totalPulls)
  );

  // Score each available lesson using UCB
  const scoredLessons: Array<{ lesson: Lesson; score: number; courseId: string }> = [];

  for (const lesson of availableLessons) {
    // Get or initialize parameters for this lesson
    const params = banditState.lessonParams[lesson.id] || initializeLessonParams(lesson.id);

    // Compute UCB score
    const ucbScore = computeUCBScore(params, contextFeatures, alpha);

    // Apply domain matching bonus
    // If the lesson matches user's weakest skill, give a small bonus
    const skillValue = context.skillLevels[lesson.domain as keyof SkillProfile] || 50;
    const weaknessBonus = (100 - skillValue) / 500; // 0-0.2 bonus for weak areas

    // Apply difficulty matching
    // Match lesson difficulty to user's preferred and current skill level
    const difficultyMatch = getDifficultyMatch(
      lesson.difficulty,
      context.preferredDifficulty,
      skillValue
    );

    // Final score combines UCB with domain and difficulty adjustments
    const finalScore = ucbScore + weaknessBonus + difficultyMatch;

    // Find the course this lesson belongs to
    const courseId = courses.find(c => c.lessons.some(l => l.id === lesson.id))?.id || '';

    scoredLessons.push({
      lesson,
      score: finalScore,
      courseId,
    });
  }

  // Sort by score (highest first) and take top N
  scoredLessons.sort((a, b) => b.score - a.score);
  const topLessons = scoredLessons.slice(0, numRecommendations);

  // Convert to recommendations with human-readable reasons
  return topLessons.map(({ lesson, score, courseId }) => ({
    lessonId: lesson.id,
    courseId,
    score,
    reason: generateRecommendationReason(lesson, context, score),
  }));
}

/**
 * Computes a difficulty matching score.
 * Lessons that match the user's skill level and preference get higher scores.
 * 
 * @param lessonDifficulty - The lesson's difficulty
 * @param preferredDifficulty - User's stated preference
 * @param skillLevel - User's skill in the lesson's domain (0-100)
 * @returns A score adjustment (-0.1 to +0.1)
 */
function getDifficultyMatch(
  lessonDifficulty: DifficultyLevel,
  preferredDifficulty: DifficultyLevel,
  skillLevel: number
): number {
  // Map difficulties to numbers
  const difficultyToNum: Record<DifficultyLevel, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  };

  const lessonDiffNum = difficultyToNum[lessonDifficulty];
  const preferredDiffNum = difficultyToNum[preferredDifficulty];

  // Compute ideal difficulty based on skill level
  // Skill 0-40: beginner (1), 40-70: intermediate (2), 70-100: advanced (3)
  let idealDiffNum: number;
  if (skillLevel < 40) {
    idealDiffNum = 1;
  } else if (skillLevel < 70) {
    idealDiffNum = 2;
  } else {
    idealDiffNum = 3;
  }

  // Blend preferred with ideal (60% ideal, 40% preference)
  const targetDiff = 0.6 * idealDiffNum + 0.4 * preferredDiffNum;

  // Score based on how close lesson is to target
  const distance = Math.abs(lessonDiffNum - targetDiff);
  return 0.1 - distance * 0.05; // Range: -0.1 to +0.1
}

/**
 * Generates a human-readable reason for why a lesson was recommended.
 * This helps users understand the adaptive system.
 * 
 * @param lesson - The recommended lesson
 * @param context - The user's context
 * @param score - The recommendation score
 * @returns A friendly explanation string
 */
function generateRecommendationReason(
  lesson: Lesson,
  context: LearningContext,
  score: number
): string {
  const skillLevel = context.skillLevels[lesson.domain as keyof SkillProfile] || 50;

  // Choose reason based on what's most relevant
  if (skillLevel < 40) {
    return `Build your ${lesson.domain} fundamentals`;
  } else if (skillLevel < 70) {
    return `Level up your ${lesson.domain} skills`;
  } else if (lesson.difficulty === 'advanced') {
    return `Challenge yourself with advanced concepts`;
  } else if (context.currentStreak >= 3) {
    return `Keep your streak going!`;
  } else if (score > 0.8) {
    return `Perfect for you right now`;
  } else {
    return `Continue your learning journey`;
  }
}

// =============================================================================
// STATE UPDATE FUNCTION
// =============================================================================

/**
 * Updates the bandit state after a user completes a lesson.
 * This is the learning step where we incorporate new feedback.
 * 
 * @param state - Current bandit state
 * @param lessonId - ID of the completed lesson
 * @param context - The context when the lesson was started
 * @param lessonReward - Performance data from the lesson
 * @returns Updated bandit state
 */
export function updateBanditState(
  state: BanditState,
  lessonId: string,
  context: LearningContext,
  lessonReward: LessonReward
): BanditState {
  // Extract context features
  const contextFeatures = extractContextFeatures(context);

  // Compute reward signal
  const reward = computeReward(lessonReward);

  // Get or initialize lesson parameters
  const currentParams = state.lessonParams[lessonId] || initializeLessonParams(lessonId);

  // Update parameters with new observation
  const updatedParams = updateLessonParams(currentParams, contextFeatures, reward);

  // Return new state (immutable update)
  return {
    lessonParams: {
      ...state.lessonParams,
      [lessonId]: updatedParams,
    },
    totalPulls: state.totalPulls + 1,
    lastUpdated: new Date().toISOString(),
  };
}

// =============================================================================
// SKILL LEVEL UPDATE
// =============================================================================

/**
 * Updates user's skill profile based on lesson performance.
 * Skills increase with good performance, decrease slightly with poor performance.
 * 
 * @param currentSkills - Current skill levels
 * @param domain - The skill domain that was tested
 * @param accuracy - How well the user did (0-1)
 * @param difficulty - The difficulty of the lesson
 * @returns Updated skill profile
 */
export function updateSkillLevels(
  currentSkills: SkillProfile,
  domain: string,
  accuracy: number,
  difficulty: DifficultyLevel
): SkillProfile {
  // Calculate skill change based on accuracy and difficulty
  // Higher difficulty = bigger potential skill gain
  const difficultyMultiplier: Record<DifficultyLevel, number> = {
    beginner: 1.0,
    intermediate: 1.5,
    advanced: 2.0,
  };

  const multiplier = difficultyMultiplier[difficulty];

  // Base change: -5 to +10 based on accuracy
  // 0% accuracy = -5, 50% = 0, 100% = +10
  let skillChange = (accuracy - 0.33) * 15 * multiplier;

  // Cap changes to prevent wild swings
  skillChange = Math.max(-5, Math.min(10, skillChange));

  // Update the specific domain
  const domainKey = domain as keyof SkillProfile;
  const currentValue = typeof currentSkills[domainKey] === 'number' 
    ? currentSkills[domainKey] as number 
    : 50;
  const newValue = Math.max(0, Math.min(100, currentValue + skillChange));

  return {
    ...currentSkills,
    [domain]: newValue,
    lastUpdated: new Date().toISOString(),
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const ContextualBandit = {
  // State management
  createInitialBanditState,
  initializeLessonParams,
  
  // Feature extraction
  extractContextFeatures,
  extractLessonFeatures,
  
  // Core algorithm
  computeUCBScore,
  updateLessonParams,
  computeReward,
  
  // Main API
  getRecommendations,
  updateBanditState,
  updateSkillLevels,
};

export default ContextualBandit;
