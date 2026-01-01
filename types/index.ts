// =============================================================================
// QUANTARA TYPE DEFINITIONS
// =============================================================================
// This file contains all TypeScript types used throughout the Quantara app.
// Types are organized by feature area for easy navigation.
// =============================================================================

// =============================================================================
// LESSON & COURSE TYPES
// =============================================================================

// The different types of content a lesson can contain
export type LessonType = 'lesson' | 'quiz' | 'simulation' | 'mixed';

// Tracks whether a user has started/completed content
export type CompletionStatus = 'not_started' | 'in_progress' | 'completed';

// Financial literacy skill domains - used for adaptive learning
// Each domain represents a major area of financial knowledge
export type SkillDomain = 
  | 'budgeting'      // Managing income and expenses
  | 'saving'         // Building emergency funds and saving habits
  | 'debt'           // Understanding loans, credit, interest
  | 'investing'      // Stocks, bonds, retirement accounts
  | 'credit';        // Credit scores, credit cards

// Difficulty levels for lessons - affects XP rewards and adaptive selection
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// =============================================================================
// QUESTION TYPES - Duolingo-style Interactive Questions
// =============================================================================

// Base interface all question types extend from
export interface BaseQuestion {
  id: string;                    // Unique identifier for the question
  type: QuestionType;            // Discriminator for the question type
  question: string;              // The question text shown to user
  explanation: string;           // Shown after answering (correct or wrong)
  xpReward: number;              // XP earned for correct answer
  difficulty: DifficultyLevel;   // Affects adaptive algorithm
  
  // ==========================================================================
  // ADAPTIVE LEARNING FIELDS - LinUCB Contextual Bandit Integration
  // ==========================================================================
  // These fields enable the adaptive difficulty system where:
  // 1. Questions are grouped by concept (conceptId)
  // 2. Each concept has 3 difficulty variants: easy, medium, hard
  // 3. LinUCB selects which difficulty to present based on user skill
  // 4. Wrong answers trigger the penalty cascade: easy → medium → hard
  
  conceptId: string;             // Links questions testing the same concept
                                 // e.g., "income-types", "compound-interest"
  
  variantGroup: string;          // Groups the 3 difficulty variants together
                                 // e.g., "income-types-v1" contains easy/med/hard
                                 
  difficultyTier: 1 | 2 | 3;     // Explicit tier within variant group:
                                 // 1 = easy (foundational)
                                 // 2 = medium (applied understanding)
                                 // 3 = hard (synthesis/analysis)
}

// All supported question types in the app
export type QuestionType = 
  | 'mcq'           // Multiple Choice Question - select one answer
  | 'true_false'    // True or False question
  | 'fill_blank'    // Fill in the blank with typed answer
  | 'matching'      // Match items from two columns
  | 'ordering'      // Put items in correct order (drag and drop)
  | 'scenario'      // Scenario-based decision making
  | 'calculation'   // Quick mental math problems
  | 'simulation';   // Interactive financial simulation

// Multiple Choice Question
// User selects one correct answer from multiple options
export interface MCQQuestion extends BaseQuestion {
  type: 'mcq';
  options: string[];             // Array of answer choices
  correctAnswer: number;         // Index of correct option (0-based)
}

// True/False Question
// Simple binary choice question
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  correctAnswer: boolean;        // true or false
}

// Fill in the Blank Question
// User types the missing word/number
export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill_blank';
  blankedText: string;           // Text with ___ for blank
  acceptedAnswers: string[];     // Multiple correct answers (case-insensitive)
}

// Matching Question
// User connects items from left column to right column
export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  leftItems: string[];           // Items on the left side
  rightItems: string[];          // Items on the right side (shuffled for display)
  correctMatches: number[];      // Index mapping: leftItems[i] matches rightItems[correctMatches[i]]
}

// Ordering Question
// User drags items into the correct sequence
export interface OrderingQuestion extends BaseQuestion {
  type: 'ordering';
  items: string[];               // Items in CORRECT order (shuffled for display)
  instruction: string;           // e.g., "Order these steps from first to last"
}

// Scenario Decision Question
// User makes a choice in a financial scenario and sees consequences
export interface ScenarioQuestion extends BaseQuestion {
  type: 'scenario';
  scenario: string;              // The situation description
  options: ScenarioOption[];     // Available choices with outcomes
  bestOptionIndex: number;       // Index of the optimal choice
}

// Each option in a scenario question
export interface ScenarioOption {
  text: string;                  // The choice text
  outcome: string;               // What happens if user picks this
  impactScore: number;           // -100 to +100, affects feedback
}

// Calculation Question
// Quick math problem related to finance
export interface CalculationQuestion extends BaseQuestion {
  type: 'calculation';
  problemText: string;           // The math problem
  correctAnswer: number;         // The numerical answer
  tolerance: number;             // Acceptable margin of error (e.g., 0.01 for cents)
  unit?: string;                 // Display unit (e.g., "$", "%")
}

// Simulation Question
// Interactive sandbox for exploring financial concepts
export interface SimulationQuestion extends BaseQuestion {
  type: 'simulation';
  simulationType: SimulationType;
  config: SimulationConfig;
  targetOutcome: string;         // What the user should achieve
}

// Types of financial simulations
export type SimulationType = 
  | 'budget_builder'       // Build a budget with income/expenses
  | 'interest_calculator'  // See how interest compounds
  | 'debt_payoff'          // Compare payoff strategies
  | 'investment_growth';   // Visualize investment over time

// Configuration for simulations
export interface SimulationConfig {
  initialValues: Record<string, number>;  // Starting numbers
  constraints: Record<string, number>;    // Limits/rules
  goal: Record<string, number>;           // Target values
}

// Union type of all question types - used in lessons
export type Question = 
  | MCQQuestion 
  | TrueFalseQuestion 
  | FillBlankQuestion 
  | MatchingQuestion 
  | OrderingQuestion 
  | ScenarioQuestion 
  | CalculationQuestion 
  | SimulationQuestion;

// =============================================================================
// MODULE TYPES - Coursera-style Learning Structure
// =============================================================================
// New hierarchy: Course > Lesson > Module (4 modules per lesson)
// - 3 interactive reading modules
// - 1 quiz module at the end
// Supports mastery-based gating and adaptive remediation

// Types of modules within a lesson
export type ModuleType = 'reading' | 'quiz' | 'assessment';

// Animation presets for reading modules to make content engaging
export type AnimationPreset = 
  | 'fade_in'         // Simple fade in
  | 'slide_up'        // Slide up from bottom
  | 'scale_in'        // Scale from small to full
  | 'typewriter'      // Text appears letter by letter
  | 'highlight';      // Key terms highlight in sequence

// Concept tags link related questions across different formats
// Used for mastery gating - user must answer variant after wrong answer
export interface ConceptTag {
  id: string;                    // e.g., "budget-definition"
  name: string;                  // Human readable: "What is a budget"
  domain: SkillDomain;           // Which skill domain
  relatedQuestionIds: string[];  // All questions testing this concept
}

// A content block within a reading module
export interface ContentBlock {
  type: 'text' | 'highlight' | 'example' | 'tip' | 'warning' | 'interactive';
  content: string;               // Markdown or plain text
  animationPreset?: AnimationPreset;
  delayMs?: number;              // Delay before showing (for sequencing)
}

// Reading module - interactive content with animations
export interface ReadingModule {
  id: string;
  type: 'reading';
  title: string;                 // Module title
  estimatedMinutes: number;      // Time to read
  xpReward: number;              // Small XP for completing reading
  contentBlocks: ContentBlock[]; // Animated content blocks
  conceptTags: string[];         // Concept IDs covered in this module
}

// Quiz module - questions with mastery requirements
export interface QuizModule {
  id: string;
  type: 'quiz';
  title: string;                 // e.g., "Quiz: Budget Basics"
  estimatedMinutes: number;
  xpReward: number;              // Larger XP for quiz completion
  questions: Question[];         // All 12 questions (4 concepts × 3 tiers)
  masteryThreshold: number;      // Percentage required to pass (e.g., 0.8 = 80%)
  conceptTags: string[];         // Concepts tested
  
  // ==========================================================================
  // ADAPTIVE QUIZ FIELDS - Added for LinUCB Contextual Bandit System
  // ==========================================================================
  // The quiz uses a hard-first testing strategy:
  // 1. Present hard question for each concept
  // 2. If correct → move to next concept (efficient for advanced learners)
  // 3. If incorrect → trigger penalty cascade: easy → medium → hard
  // 4. Total questions: 4 concepts × 3 tiers = 12 possible questions
  
  conceptVariants?: ConceptVariant[];  // The 4 concepts with their 3-tier variants
                                       // Optional for backward compatibility
}

// Assessment module - standalone skill test (Test Your Skill section)
export interface AssessmentModule {
  id: string;
  type: 'assessment';
  title: string;
  estimatedMinutes: number;
  xpReward: number;
  questions: Question[];
  feedsIntoLessons: boolean;     // If true, wrong answers add to remediation
}

// Union type for all module types
export type LessonModule = ReadingModule | QuizModule | AssessmentModule;

// Progress tracking for a single module
export interface ModuleProgress {
  moduleId: string;
  status: CompletionStatus;
  score?: number;                // Quiz/assessment score (0-100)
  attempts: number;              // Number of attempts
  lastAttemptDate?: string;      // ISO timestamp
  masteryAchieved: boolean;      // Whether user has mastered this module
}

// Progress tracking for a lesson (all modules)
export interface LessonProgress {
  lessonId: string;
  moduleProgress: Record<string, ModuleProgress>;
  overallStatus: CompletionStatus;
  canProceed: boolean;           // Whether user can advance to next lesson
}

// Wrong answer entry for remediation tracking
export interface WrongAnswerEntry {
  questionId: string;
  conceptId: string;             // Which concept was missed
  questionType: QuestionType;    // Format of failed question
  timestamp: string;             // When the error occurred
  lessonId: string;              // Where the error occurred
  requiresRemediation: boolean;  // Whether user must retry
  remediationComplete: boolean;  // Whether user has passed variant
  variantQuestionId?: string;    // ID of the variant question to answer
}

// =============================================================================
// LESSON & COURSE STRUCTURES
// =============================================================================

// A single lesson within a course (Coursera-style with 4 modules)
export interface Lesson {
  id: string;                    // Unique identifier
  title: string;                 // Display title
  type: LessonType;              // What kind of lesson
  estimatedMinutes: number;      // Time to complete all modules
  completionStatus: CompletionStatus;
  domain: SkillDomain;           // Which skill this teaches
  difficulty: DifficultyLevel;   // Lesson difficulty
  xpReward: number;              // Total XP for completing
  
  // New: Coursera-style module structure
  modules: LessonModule[];       // Array of 4 modules (3 reading + 1 quiz)
  
  // Legacy support - will be migrated to modules
  content?: string;              // Markdown content for reading
  questions: Question[];         // Interactive questions in this lesson
}

// Legacy quiz structure (kept for backward compatibility)
export interface QuizData {
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

// A course containing multiple lessons
export interface Course {
  id: string;                    // Unique identifier
  title: string;                 // Course name
  description: string;           // What user will learn
  icon: string;                  // Feather icon name
  color: string;                 // Theme color for the course
  domain: SkillDomain;           // Primary skill domain
  lessons: Lesson[];             // All lessons in order
  totalXP: number;               // Sum of all lesson XP
  estimatedHours: number;        // Total time to complete
}

// Legacy module structure (kept for backward compatibility)
export interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: LegacyLesson[];
}

// Legacy lesson structure
export interface LegacyLesson {
  id: string;
  title: string;
  type: LessonType;
  estimatedMinutes: number;
  completionStatus: CompletionStatus;
  content?: string;
  quiz?: QuizData;
}

// =============================================================================
// GAMIFICATION TYPES
// =============================================================================

// User's current game state - hearts, XP, streaks
export interface GamificationState {
  hearts: number;                // Lives remaining (max 10)
  maxHearts: number;             // Maximum hearts (10)
  xp: number;                    // Total experience points
  todayXP: number;               // XP earned today (resets daily)
  todayXPDate: string;           // Date for todayXP tracking (YYYY-MM-DD)
  level: number;                 // Current level (calculated from XP)
  streak: number;                // Current day streak
  longestStreak: number;         // Best streak ever achieved
  lastActiveDate: string;        // ISO date of last activity
  heartsLastRefilled: string;    // ISO timestamp of last heart refill
  activeDays: string[];          // Array of YYYY-MM-DD dates when user was active
}

// XP thresholds for each level
export const XP_PER_LEVEL = 1000;  // XP needed per level

// Hearts regeneration (1 heart per 30 minutes)
export const HEART_REGEN_MINUTES = 30;
export const MAX_HEARTS = 10;

// Streak bonuses
export const STREAK_XP_BONUS = {
  3: 1.1,    // 10% bonus at 3 day streak
  7: 1.25,   // 25% bonus at 7 day streak
  14: 1.5,   // 50% bonus at 14 day streak
  30: 2.0,   // 100% bonus at 30 day streak
};

// Achievement definition
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;                  // Feather icon name
  xpReward: number;
  condition: AchievementCondition;
  unlockedAt?: string;           // ISO timestamp when unlocked
}

// Conditions for unlocking achievements
export interface AchievementCondition {
  type: 'lessons_completed' | 'courses_completed' | 'streak' | 'xp' | 'perfect_score';
  target: number;                // Number to reach
  domain?: SkillDomain;          // Optional: specific domain
}

// =============================================================================
// ADAPTIVE LEARNING / CONTEXTUAL BANDIT TYPES
// =============================================================================

// User's skill profile across all domains
// Skills are scored 0-100 based on quiz performance
export interface SkillProfile {
  budgeting: number;             // 0-100 skill score
  saving: number;
  debt: number;
  investing: number;
  credit: number;
  lastUpdated: string;           // ISO timestamp
}

// Default starting skills for new users
// NOTE: Skills start at 0% and increase ONLY through lesson completion
// Pre-assessment results are stored separately and used for recommendations
export const DEFAULT_SKILLS: SkillProfile = {
  budgeting: 0,
  saving: 0,
  debt: 0,
  investing: 0,
  credit: 0,
  lastUpdated: new Date().toISOString(),
};

// Baseline skills from pre-assessment (stored separately from displayed skills)
// Used by contextual bandit for initial recommendations
export interface BaselineAssessment {
  skills: SkillProfile;
  completedAt: string;
  courseId: string;
};

// Pre-assessment result for course entry - identifies weak spots
export interface CoursePreAssessmentResult {
  courseId: string;
  completedAt: string;
  weakConcepts: string[];          // Concept IDs where user scored poorly
  strongConcepts: string[];        // Concept IDs where user excelled
  domainScores: Record<SkillDomain, number>;  // Per-domain score (0-100)
  overallScore: number;            // Overall percentage
  questionsAnswered: number;
  questionsCorrect: number;
}

// Penalty question entry - tracks extra questions injected for wrong answers
export interface PenaltyQuestion {
  originalQuestionId: string;      // The question user got wrong
  conceptId: string;               // Concept being remediated
  penaltyQuestionIds: string[];    // IDs of penalty questions to answer
  answeredCorrectly: number;       // How many penalty questions answered correctly
  required: number;                // How many penalty questions required (default 2)
  completed: boolean;              // Whether all penalty questions answered correctly
}

// Context vector for the contextual bandit algorithm
// These features help the algorithm decide which lesson to recommend
export interface LearningContext {
  skillLevels: SkillProfile;     // User's current skill levels
  currentStreak: number;         // Days in a row
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  sessionNumber: number;         // How many sessions today
  lastLessonDifficulty: DifficultyLevel;
  lastLessonPerformance: number; // 0-1 score on last lesson
  preferredDifficulty: DifficultyLevel;
  completedLessonIds: string[];  // All completed lessons
}

// State for the LinUCB contextual bandit algorithm
// This stores the learned parameters for each lesson "arm"
export interface BanditState {
  // For each lesson (arm), we store:
  // - A matrix (simplified as array) for computing confidence bounds
  // - A vector for the reward estimates
  // The algorithm uses these to balance exploration vs exploitation
  lessonParams: Record<string, LessonBanditParams>;
  totalPulls: number;            // Total lessons recommended
  lastUpdated: string;           // ISO timestamp
}

// Parameters stored for each lesson in the bandit algorithm
export interface LessonBanditParams {
  lessonId: string;
  pullCount: number;             // Times this lesson was recommended
  rewardSum: number;             // Sum of rewards received
  averageReward: number;         // Average reward (rewardSum / pullCount)
  // LinUCB specific parameters (simplified for on-device)
  theta: number[];               // Weight vector for context features
  confidence: number;            // Upper confidence bound
}

// Reward signal after completing a lesson
// Higher rewards make the bandit more likely to recommend similar content
export interface LessonReward {
  lessonId: string;
  accuracy: number;              // 0-1, percentage of correct answers
  completionTime: number;        // Seconds to complete
  expectedTime: number;          // Expected seconds (from lesson.estimatedMinutes)
  completed: boolean;            // Did they finish?
  userRating?: number;           // Optional 1-5 rating
}

// Recommendation from the adaptive system
export interface AdaptiveRecommendation {
  lessonId: string;
  courseId: string;
  score: number;                 // Recommendation confidence (higher = better)
  reason: string;                // Human-readable explanation
}

// =============================================================================
// CONCEPT VARIANT CATALOG - Groups questions by concept and difficulty
// =============================================================================
// 
// The adaptive difficulty system works as follows:
// 1. Each quiz has 4 concepts to test
// 2. Each concept has 3 difficulty variants: easy (tier 1), medium (tier 2), hard (tier 3)
// 3. User is first tested with the HARD question (efficient for advanced learners)
// 4. If correct: move to next concept
// 5. If incorrect: inject easy → medium → hard as penalty cascade
// 6. Total possible questions: 4 concepts × 3 difficulties = 12 per quiz
//

// Represents a single concept with its 3 difficulty variants
export interface ConceptVariant {
  conceptId: string;             // Unique concept identifier e.g., "income-types"
  conceptName: string;           // Human readable e.g., "Types of Income"
  variantGroup: string;          // Groups the variants e.g., "income-types-v1"
  domain: string;                // Skill domain this concept belongs to
  
  // The three difficulty tiers - all must be present
  easyQuestionId: string;        // Tier 1: Foundational knowledge
  mediumQuestionId: string;      // Tier 2: Applied understanding
  hardQuestionId: string;        // Tier 3: Synthesis/analysis
}

// Catalog of all concepts for a quiz module
export interface ConceptVariantCatalog {
  quizModuleId: string;          // ID of the quiz module this catalog belongs to
  lessonId: string;              // Parent lesson ID
  concepts: ConceptVariant[];    // The 4 concepts tested in this quiz
  
  // Metadata for research
  totalQuestions: number;        // Should be concepts.length * 3
  masteryThreshold: number;      // Default 0.8 (80%) to pass
}

// Tracks a user's progress through the adaptive quiz flow
export interface AdaptiveQuizState {
  currentConceptIndex: number;   // Which concept we're testing (0-3)
  currentTier: 1 | 2 | 3;        // Current difficulty tier being shown
  conceptResults: ConceptResult[]; // Results per concept
  
  // Penalty cascade tracking
  inPenaltyCascade: boolean;     // True if user got hard question wrong
  penaltyCascadePosition: number; // 0=easy, 1=medium, 2=hard (in cascade)
  
  // Overall stats
  totalQuestionsAnswered: number;
  totalCorrect: number;
  heartsLost: number;
}

// Result for a single concept attempt
export interface ConceptResult {
  conceptId: string;
  hardAttemptCorrect: boolean | null;  // Result of initial hard question
  penaltyCascadeTriggered: boolean;    // Did they need the penalty cascade?
  easyCorrect: boolean | null;         // Result of easy (if triggered)
  mediumCorrect: boolean | null;       // Result of medium (if triggered)
  hardRetryCorrect: boolean | null;    // Result of hard retry (if triggered)
  totalAttempts: number;               // Questions answered for this concept
  mastered: boolean;                   // Did they demonstrate mastery?
}

// =============================================================================
// RESEARCH / ANALYTICS TYPES
// =============================================================================

// Adaptive attempt log - captures every bandit decision for research
export interface AdaptiveAttemptLog {
  id: string;                    // Unique log entry ID
  timestamp: string;             // ISO timestamp
  userId: string;                // User identifier (anonymized)
  sessionId: string;             // Current session ID
  
  // Context at decision time
  userContext: {
    skillLevels: SkillProfile;
    streak: number;
    sessionNumber: number;
    timeOfDay: string;
  };
  
  // What was shown
  conceptId: string;             // The concept being tested
  questionId: string;            // The specific question shown
  difficultyTier: 1 | 2 | 3;     // Easy/Medium/Hard
  wasInitialHard: boolean;       // Was this the initial hard test?
  wasPenalty: boolean;           // Was this part of penalty cascade?
  penaltyPosition: number;       // Position in cascade (0-2)
  
  // Outcome
  correct: boolean;              // Did user answer correctly?
  responseTimeMs: number;        // Time to answer
  heartsRemaining: number;       // Hearts after this question
  
  // Bandit parameters (for reproducibility)
  banditAlpha: number;           // Exploration parameter at decision time
  conceptArmScore: number;       // UCB score for this concept
  selectedByBandit: boolean;     // Was concept order determined by LinUCB?
}

// Stores results of pre/post assessment for research
export interface AssessmentResult {
  assessmentType: 'pre' | 'post';
  timestamp: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;              // 0-1
  timeSpentSeconds: number;
  domainScores: Record<SkillDomain, number>;  // Per-domain accuracy
  confidenceRating: number;      // 1-5 self-reported confidence
}

// Telemetry for each lesson attempt (for research)
export interface LessonAttemptLog {
  lessonId: string;
  courseId: string;
  startTime: string;             // ISO timestamp
  endTime: string;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;
  heartsLost: number;
  hintsUsed: number;
  xpEarned: number;
  wasRecommended: boolean;       // Was this from adaptive system?
  confidenceRating?: number;     // Optional post-lesson rating
}

// Session log for engagement tracking
export interface SessionLog {
  sessionId: string;
  startTime: string;
  endTime: string;
  lessonsCompleted: number;
  totalXPEarned: number;
  streakMaintained: boolean;
}

// =============================================================================
// CHALLENGE TYPES (existing, kept for compatibility)
// =============================================================================

export type ChallengeCategory = 'spending' | 'debt' | 'subscriptions' | 'saving';
export type ChallengeStatus = 'not_started' | 'in_progress' | 'completed';

export interface Challenge {
  id: string;
  title: string;
  category: ChallengeCategory;
  status: ChallengeStatus;
  description: string;
  steps?: string[];
}

// =============================================================================
// RECOMMENDATION TYPES (existing, kept for compatibility)
// =============================================================================

export type RecommendationKind = 'lesson' | 'challenge' | 'simulation';

export interface Recommendation {
  id: string;
  title: string;
  kind: RecommendationKind;
  shortDescription: string;
  linkedId: string;
}

// =============================================================================
// USER DATA TYPES
// =============================================================================

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  active: boolean;
}

// Individual debt item for tracking multiple debts
export interface DebtItem {
  id: string;
  name: string;                // e.g., "Student Loan", "Credit Card"
  balance: number;             // Current balance
  interestRate: number;        // APR as percentage
  minimumPayment: number;      // Monthly minimum
  dueDate?: number;            // Day of month
}

// Portfolio asset for tracking investments
export interface PortfolioAsset {
  id: string;
  name: string;                // e.g., "Apple Stock", "Bitcoin"
  type: 'stock' | 'crypto' | 'bond' | 'etf' | 'cash' | 'property' | 'other';
  quantity: number;            // How many units owned
  purchasePrice: number;       // Price per unit when bought
  currentValue: number;        // Current estimated value per unit
}

export interface FinancialSnapshot {
  monthlyIncome: number;
  monthlyExpenses: number;
  totalDebt: number;
  savingsGoal: number;
  currentSavings: number;
  subscriptions: Subscription[];
  debtItems: DebtItem[];       // Detailed breakdown of debts
  portfolioAssets: PortfolioAsset[]; // Investment portfolio
}

export interface UserProfile {
  name: string;
  avatar: number;
}

// Complete user learning state
export interface UserLearningState {
  gamification: GamificationState;
  skills: SkillProfile;
  completedLessons: string[];
  currentCourseId?: string;
  currentLessonId?: string;
  preAssessment?: AssessmentResult;
  postAssessment?: AssessmentResult;
  lessonAttempts: LessonAttemptLog[];
  sessions: SessionLog[];
}
