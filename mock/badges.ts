import { SkillDomain } from '@/types';

export type BadgeCategory = 'learning' | 'streak' | 'mastery' | 'special';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  criteria: BadgeCriteria;
  xpReward: number;
}

export type BadgeCriteria = 
  | { type: 'quiz_count'; count: number }
  | { type: 'lesson_count'; count: number }
  | { type: 'streak_days'; days: number }
  | { type: 'perfect_quiz'; count: number }
  | { type: 'domain_complete'; domain: SkillDomain }
  | { type: 'total_xp'; amount: number }
  | { type: 'savings_goal_set' }
  | { type: 'challenge_complete'; count: number }
  | { type: 'first_login' };

export const BADGES: Badge[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: 'book-open',
    category: 'learning',
    criteria: { type: 'lesson_count', count: 1 },
    xpReward: 10,
  },
  {
    id: 'first-quiz',
    name: 'Quiz Starter',
    description: 'Complete your first quiz',
    icon: 'check-circle',
    category: 'learning',
    criteria: { type: 'quiz_count', count: 1 },
    xpReward: 15,
  },
  {
    id: 'quiz-enthusiast',
    name: 'Quiz Enthusiast',
    description: 'Complete 5 quizzes',
    icon: 'award',
    category: 'learning',
    criteria: { type: 'quiz_count', count: 5 },
    xpReward: 30,
  },
  {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'Complete 20 quizzes',
    icon: 'star',
    category: 'mastery',
    criteria: { type: 'quiz_count', count: 20 },
    xpReward: 100,
  },
  {
    id: 'streak-3',
    name: 'Getting Started',
    description: 'Reach a 3-day streak',
    icon: 'zap',
    category: 'streak',
    criteria: { type: 'streak_days', days: 3 },
    xpReward: 20,
  },
  {
    id: 'streak-5',
    name: 'On Fire',
    description: 'Reach a 5-day streak',
    icon: 'trending-up',
    category: 'streak',
    criteria: { type: 'streak_days', days: 5 },
    xpReward: 35,
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Reach a 7-day streak',
    icon: 'shield',
    category: 'streak',
    criteria: { type: 'streak_days', days: 7 },
    xpReward: 50,
  },
  {
    id: 'streak-30',
    name: 'Unstoppable',
    description: 'Reach a 30-day streak',
    icon: 'sun',
    category: 'streak',
    criteria: { type: 'streak_days', days: 30 },
    xpReward: 200,
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Get 100% on a quiz',
    icon: 'target',
    category: 'mastery',
    criteria: { type: 'perfect_quiz', count: 1 },
    xpReward: 25,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Get 100% on 5 quizzes',
    icon: 'circle',
    category: 'mastery',
    criteria: { type: 'perfect_quiz', count: 5 },
    xpReward: 75,
  },
  {
    id: 'budget-beginner',
    name: 'Budget Beginner',
    description: 'Complete the budgeting module',
    icon: 'pie-chart',
    category: 'learning',
    criteria: { type: 'domain_complete', domain: 'budgeting' },
    xpReward: 50,
  },
  {
    id: 'saving-star',
    name: 'Saving Star',
    description: 'Complete the saving module',
    icon: 'dollar-sign',
    category: 'learning',
    criteria: { type: 'domain_complete', domain: 'saving' },
    xpReward: 50,
  },
  {
    id: 'debt-destroyer',
    name: 'Debt Destroyer',
    description: 'Complete the debt module',
    icon: 'scissors',
    category: 'learning',
    criteria: { type: 'domain_complete', domain: 'debt' },
    xpReward: 50,
  },
  {
    id: 'investment-intro',
    name: 'Investment Intro',
    description: 'Complete the investing module',
    icon: 'bar-chart-2',
    category: 'learning',
    criteria: { type: 'domain_complete', domain: 'investing' },
    xpReward: 50,
  },
  {
    id: 'goal-setter',
    name: 'Goal Setter',
    description: 'Set a savings goal',
    icon: 'flag',
    category: 'special',
    criteria: { type: 'savings_goal_set' },
    xpReward: 15,
  },
  {
    id: 'challenger',
    name: 'Challenger',
    description: 'Complete your first challenge',
    icon: 'compass',
    category: 'special',
    criteria: { type: 'challenge_complete', count: 1 },
    xpReward: 20,
  },
  {
    id: 'xp-100',
    name: 'Century Club',
    description: 'Earn 100 total XP',
    icon: 'gift',
    category: 'special',
    criteria: { type: 'total_xp', amount: 100 },
    xpReward: 10,
  },
  {
    id: 'xp-500',
    name: 'XP Hunter',
    description: 'Earn 500 total XP',
    icon: 'box',
    category: 'special',
    criteria: { type: 'total_xp', amount: 500 },
    xpReward: 25,
  },
  {
    id: 'xp-1000',
    name: 'XP Champion',
    description: 'Earn 1000 total XP',
    icon: 'hexagon',
    category: 'mastery',
    criteria: { type: 'total_xp', amount: 1000 },
    xpReward: 50,
  },
];

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id);
}

export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  return BADGES.filter(b => b.category === category);
}
