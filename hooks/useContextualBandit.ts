import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkillDomain } from '../types';

const BANDIT_STATE_KEY = '@quantara_bandit_state';

export interface CategoryStats {
  domain: SkillDomain;
  attempts: number;
  successes: number;
  totalScore: number;
  lastScore: number;
  lastAttemptTime: number;
  recentScores: number[];
  streakCorrect: number;
  streakIncorrect: number;
}

interface BanditState {
  categoryStats: Record<SkillDomain, CategoryStats>;
  explorationRate: number;
  totalInteractions: number;
  lastUpdated: string;
}

interface BanditRecommendation {
  domain: SkillDomain;
  score: number;
  reason: string;
  isExploration: boolean;
  confidence: number;
}

const DEFAULT_DOMAINS: SkillDomain[] = ['budgeting', 'saving', 'debt', 'investing', 'credit'];

function initializeCategoryStats(): Record<SkillDomain, CategoryStats> {
  const stats: Partial<Record<SkillDomain, CategoryStats>> = {};
  for (const domain of DEFAULT_DOMAINS) {
    stats[domain] = {
      domain,
      attempts: 0,
      successes: 0,
      totalScore: 0,
      lastScore: 0,
      lastAttemptTime: 0,
      recentScores: [],
      streakCorrect: 0,
      streakIncorrect: 0,
    };
  }
  return stats as Record<SkillDomain, CategoryStats>;
}

function getDefaultBanditState(): BanditState {
  return {
    categoryStats: initializeCategoryStats(),
    explorationRate: 0.3,
    totalInteractions: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function gammaVariate(shape: number, scale: number = 1.0): number {
  if (shape <= 0) return 0.001;
  
  if (shape < 1) {
    const u = Math.random();
    return gammaVariate(1 + shape, scale) * Math.pow(u, 1 / shape);
  }
  
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  
  let attempts = 0;
  const maxAttempts = 1000;
  
  while (attempts < maxAttempts) {
    attempts++;
    let x: number, v: number;
    
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    
    v = v * v * v;
    const u = Math.random();
    
    const xSquared = x * x;
    if (u < 1 - 0.0331 * xSquared * xSquared) {
      return d * v * scale;
    }
    
    if (Math.log(u) < 0.5 * xSquared + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
  
  return shape * scale;
}

function normalRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function betaSample(alpha: number, beta: number): number {
  if (alpha <= 0) alpha = 0.001;
  if (beta <= 0) beta = 0.001;
  
  const gammaA = gammaVariate(alpha, 1.0);
  const gammaB = gammaVariate(beta, 1.0);
  
  const sum = gammaA + gammaB;
  if (sum === 0) return 0.5;
  
  return gammaA / sum;
}

function calculateDecayedScore(recentScores: number[], decayFactor: number = 0.8): number {
  if (recentScores.length === 0) return 0.5;
  let weightedSum = 0;
  let weightSum = 0;
  for (let i = 0; i < recentScores.length; i++) {
    const weight = Math.pow(decayFactor, recentScores.length - 1 - i);
    weightedSum += recentScores[i] * weight;
    weightSum += weight;
  }
  return weightedSum / weightSum;
}

function calculateTimeSinceLastAttempt(lastAttemptTime: number): number {
  if (lastAttemptTime === 0) return Infinity;
  const hoursSince = (Date.now() - lastAttemptTime) / (1000 * 60 * 60);
  return hoursSince;
}

export function useContextualBandit() {
  const [banditState, setBanditState] = useState<BanditState>(getDefaultBanditState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBanditState();
  }, []);

  const loadBanditState = async () => {
    try {
      const stored = await AsyncStorage.getItem(BANDIT_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validState = {
          ...getDefaultBanditState(),
          ...parsed,
          categoryStats: {
            ...initializeCategoryStats(),
            ...parsed.categoryStats,
          },
        };
        setBanditState(validState);
      }
    } catch (error) {
      console.error('Failed to load bandit state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBanditState = async (state: BanditState) => {
    try {
      await AsyncStorage.setItem(BANDIT_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save bandit state:', error);
    }
  };

  const recordOutcome = useCallback(async (
    domain: SkillDomain,
    score: number,
    passed: boolean,
    timeSpentSeconds?: number
  ) => {
    const validScore = Math.max(0, Math.min(1, isNaN(score) ? 0 : score));
    const validTimeSpent = timeSpentSeconds !== undefined && !isNaN(timeSpentSeconds) && timeSpentSeconds > 0 
      ? timeSpentSeconds 
      : undefined;
    
    setBanditState(prev => {
      const stats = { ...prev.categoryStats[domain] };
      stats.attempts += 1;
      stats.successes += passed ? 1 : 0;
      stats.totalScore += validScore;
      stats.lastScore = validScore;
      stats.lastAttemptTime = Date.now();
      stats.recentScores = [...stats.recentScores.slice(-9), validScore];
      
      if (passed) {
        stats.streakCorrect += 1;
        stats.streakIncorrect = 0;
      } else {
        stats.streakIncorrect += 1;
        stats.streakCorrect = 0;
      }
      
      let newExplorationRate = prev.explorationRate;
      if (prev.totalInteractions < 10) {
        newExplorationRate = 0.4;
      } else if (prev.totalInteractions < 30) {
        newExplorationRate = 0.25;
      } else {
        newExplorationRate = Math.max(0.1, 0.3 - (prev.totalInteractions * 0.002));
      }
      
      const newState: BanditState = {
        categoryStats: {
          ...prev.categoryStats,
          [domain]: stats,
        },
        explorationRate: newExplorationRate,
        totalInteractions: prev.totalInteractions + 1,
        lastUpdated: new Date().toISOString(),
      };
      
      saveBanditState(newState);
      return newState;
    });
  }, []);

  const getRecommendations = useCallback((
    count: number = 3,
    excludeDomains: SkillDomain[] = []
  ): BanditRecommendation[] => {
    const availableDomains = DEFAULT_DOMAINS.filter(d => !excludeDomains.includes(d));
    const recommendations: BanditRecommendation[] = [];
    
    for (const domain of availableDomains) {
      const stats = banditState.categoryStats[domain];
      
      const alpha = stats.successes + 1;
      const beta = (stats.attempts - stats.successes) + 1;
      const sampledValue = betaSample(alpha, beta);
      
      const decayedPerformance = calculateDecayedScore(stats.recentScores);
      const hoursSinceAttempt = calculateTimeSinceLastAttempt(stats.lastAttemptTime);
      
      let timeBonus = 0;
      if (hoursSinceAttempt > 72) {
        timeBonus = 0.15;
      } else if (hoursSinceAttempt > 24) {
        timeBonus = 0.08;
      }
      
      let struggleBonus = 0;
      if (stats.streakIncorrect >= 2) {
        struggleBonus = 0.25 + (stats.streakIncorrect * 0.05);
      } else if (decayedPerformance < 0.5 && stats.attempts >= 3) {
        struggleBonus = 0.15;
      }
      
      const uncertaintyBonus = stats.attempts < 5 ? 0.2 * (1 - stats.attempts / 5) : 0;
      
      const masteryPenalty = stats.streakCorrect >= 5 ? 0.1 : 0;
      
      const finalScore = sampledValue + timeBonus + struggleBonus + uncertaintyBonus - masteryPenalty;
      
      const isExploration = Math.random() < banditState.explorationRate;
      
      let reason = '';
      if (stats.streakIncorrect >= 2) {
        reason = `Practice makes perfect - let's strengthen your ${domain} skills`;
      } else if (decayedPerformance < 0.5 && stats.attempts >= 3) {
        reason = `Keep building your ${domain} foundation`;
      } else if (hoursSinceAttempt > 48) {
        reason = `Time to refresh your ${domain} knowledge`;
      } else if (stats.attempts < 3) {
        reason = `Discover ${domain} concepts`;
      } else if (stats.streakCorrect >= 3) {
        reason = `You're on a roll with ${domain}!`;
      } else {
        reason = `Continue learning ${domain}`;
      }
      
      const confidence = stats.attempts === 0 ? 0.1 : Math.min(0.95, 0.3 + (stats.attempts * 0.1));
      
      recommendations.push({
        domain,
        score: isExploration ? finalScore + (Math.random() * 0.3) : finalScore,
        reason,
        isExploration,
        confidence,
      });
    }
    
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, count);
  }, [banditState]);

  const getNextLessonsForDomain = useCallback((
    domain: SkillDomain,
    count: number = 2
  ): { priority: 'high' | 'medium' | 'low'; reason: string } => {
    const stats = banditState.categoryStats[domain];
    
    if (stats.streakIncorrect >= 2) {
      return { priority: 'high', reason: 'Needs focused practice after recent struggles' };
    }
    if (calculateDecayedScore(stats.recentScores) < 0.5 && stats.attempts >= 3) {
      return { priority: 'high', reason: 'Building foundational understanding' };
    }
    if (stats.attempts < 3) {
      return { priority: 'medium', reason: 'New topic to explore' };
    }
    if (stats.streakCorrect >= 3) {
      return { priority: 'low', reason: 'Already performing well' };
    }
    return { priority: 'medium', reason: 'Continuing steady progress' };
  }, [banditState]);

  const getCategoryPerformance = useCallback((domain: SkillDomain) => {
    const stats = banditState.categoryStats[domain];
    return {
      successRate: stats.attempts > 0 ? stats.successes / stats.attempts : 0,
      averageScore: stats.attempts > 0 ? stats.totalScore / stats.attempts : 0,
      recentTrend: calculateDecayedScore(stats.recentScores),
      totalAttempts: stats.attempts,
      currentStreak: stats.streakCorrect > 0 ? stats.streakCorrect : -stats.streakIncorrect,
      needsAttention: stats.streakIncorrect >= 2 || (calculateDecayedScore(stats.recentScores) < 0.5 && stats.attempts >= 3),
    };
  }, [banditState]);

  const getAllPerformanceStats = useCallback(() => {
    return DEFAULT_DOMAINS.map(domain => ({
      domain,
      ...getCategoryPerformance(domain),
    }));
  }, [getCategoryPerformance]);

  const resetBanditState = useCallback(async () => {
    const freshState = getDefaultBanditState();
    setBanditState(freshState);
    await saveBanditState(freshState);
  }, []);

  return {
    isLoading,
    banditState,
    recordOutcome,
    getRecommendations,
    getNextLessonsForDomain,
    getCategoryPerformance,
    getAllPerformanceStats,
    resetBanditState,
    explorationRate: banditState.explorationRate,
    totalInteractions: banditState.totalInteractions,
  };
}
