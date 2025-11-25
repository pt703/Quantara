export type LessonType = 'lesson' | 'quiz' | 'simulation';
export type CompletionStatus = 'not_started' | 'in_progress' | 'completed';
export type ChallengeCategory = 'spending' | 'debt' | 'subscriptions' | 'saving';
export type ChallengeStatus = 'not_started' | 'in_progress' | 'completed';
export type RecommendationKind = 'lesson' | 'challenge' | 'simulation';

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  estimatedMinutes: number;
  completionStatus: CompletionStatus;
  content?: string;
  quiz?: QuizData;
}

export interface QuizData {
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: Lesson[];
}

export interface Challenge {
  id: string;
  title: string;
  category: ChallengeCategory;
  status: ChallengeStatus;
  description: string;
  steps?: string[];
}

export interface Recommendation {
  id: string;
  title: string;
  kind: RecommendationKind;
  shortDescription: string;
  linkedId: string;
}

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  active: boolean;
}

export interface FinancialSnapshot {
  monthlyIncome: number;
  monthlyExpenses: number;
  totalDebt: number;
  savingsGoal: number;
  currentSavings: number;
  subscriptions: Subscription[];
}

export interface UserProfile {
  name: string;
  avatar: number;
}
