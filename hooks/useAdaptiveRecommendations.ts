import { useMemo, useCallback } from 'react';
import { useContextualBandit, CategoryStats } from './useContextualBandit';
import { useLearningProgress } from './useLearningProgress';
import { modules } from '../mock/modules';
import { SkillDomain, LegacyLesson, Module } from '../types';

export interface AdaptiveRecommendation {
  id: string;
  type: 'lesson' | 'quiz' | 'challenge' | 'review';
  title: string;
  subtitle: string;
  moduleId: string;
  lessonId: string;
  domain: SkillDomain;
  priority: number;
  reason: string;
  isExploration: boolean;
  estimatedMinutes: number;
}

const DOMAIN_MAPPING: Record<string, SkillDomain> = {
  'module-1': 'budgeting',
  'module-2': 'debt',
  'module-3': 'investing',
  'module-4': 'saving',
  'module-5': 'credit',
};

function getLessonDomain(moduleId: string): SkillDomain {
  return DOMAIN_MAPPING[moduleId] || 'budgeting';
}

export function useAdaptiveRecommendations() {
  const { 
    getRecommendations, 
    getCategoryPerformance, 
    getAllPerformanceStats,
    isLoading: banditLoading,
  } = useContextualBandit();
  
  const { 
    getLessonStatus, 
    loading: progressLoading 
  } = useLearningProgress();

  const completedLessonIds = useMemo(() => {
    const completed = new Set<string>();
    for (const module of modules) {
      for (const lesson of module.lessons) {
        if (getLessonStatus(lesson.id) === 'completed') {
          completed.add(lesson.id);
        }
      }
    }
    return completed;
  }, [getLessonStatus]);

  const getAvailableLessons = useCallback(() => {
    const available: Array<{
      module: Module;
      lesson: LegacyLesson;
      domain: SkillDomain;
      isCompleted: boolean;
    }> = [];

    for (const module of modules) {
      const domain = getLessonDomain(module.id);
      for (const lesson of module.lessons) {
        available.push({
          module,
          lesson,
          domain,
          isCompleted: completedLessonIds.has(lesson.id),
        });
      }
    }

    return available;
  }, [completedLessonIds]);

  const generateRecommendations = useCallback((
    count: number = 5
  ): AdaptiveRecommendation[] => {
    const banditRecs = getRecommendations(5);
    const allLessons = getAvailableLessons();
    const recommendations: AdaptiveRecommendation[] = [];
    const usedLessonIds = new Set<string>();

    for (const rec of banditRecs) {
      const domainLessons = allLessons
        .filter(l => l.domain === rec.domain && !l.isCompleted && !usedLessonIds.has(l.lesson.id));

      const performance = getCategoryPerformance(rec.domain);
      
      if (performance.needsAttention && domainLessons.length > 0) {
        const lessonLesson = domainLessons.find(l => l.lesson.type === 'lesson');
        if (lessonLesson) {
          usedLessonIds.add(lessonLesson.lesson.id);
          recommendations.push({
            id: `rec-${lessonLesson.lesson.id}`,
            type: 'lesson',
            title: lessonLesson.lesson.title,
            subtitle: `Strengthen your ${rec.domain} skills`,
            moduleId: lessonLesson.module.id,
            lessonId: lessonLesson.lesson.id,
            domain: rec.domain,
            priority: rec.score + 0.2,
            reason: rec.reason,
            isExploration: false,
            estimatedMinutes: lessonLesson.lesson.estimatedMinutes,
          });
          continue;
        }
      }

      if (domainLessons.length > 0) {
        const nextLesson = domainLessons[0];
        usedLessonIds.add(nextLesson.lesson.id);
        recommendations.push({
          id: `rec-${nextLesson.lesson.id}`,
          type: nextLesson.lesson.type === 'quiz' ? 'quiz' : 'lesson',
          title: nextLesson.lesson.title,
          subtitle: nextLesson.module.title,
          moduleId: nextLesson.module.id,
          lessonId: nextLesson.lesson.id,
          domain: rec.domain,
          priority: rec.score,
          reason: rec.reason,
          isExploration: rec.isExploration,
          estimatedMinutes: nextLesson.lesson.estimatedMinutes,
        });
      }
    }

    const completedLessons = allLessons.filter(l => l.isCompleted);
    const stats = getAllPerformanceStats();
    const weakDomains = stats
      .filter(s => s.needsAttention || (s.recentTrend < 0.6 && s.totalAttempts >= 2))
      .map(s => s.domain);

    for (const domain of weakDomains) {
      const domainCompleted = completedLessons
        .filter(l => l.domain === domain && !usedLessonIds.has(l.lesson.id))
        .slice(0, 1);
      
      for (const lesson of domainCompleted) {
        usedLessonIds.add(lesson.lesson.id);
        recommendations.push({
          id: `review-${lesson.lesson.id}`,
          type: 'review',
          title: `Review: ${lesson.lesson.title}`,
          subtitle: 'Refresh your understanding',
          moduleId: lesson.module.id,
          lessonId: lesson.lesson.id,
          domain,
          priority: 0.7,
          reason: `Recent scores in ${domain} suggest a review would help`,
          isExploration: false,
          estimatedMinutes: Math.ceil(lesson.lesson.estimatedMinutes * 0.5),
        });
      }
    }

    recommendations.sort((a, b) => b.priority - a.priority);
    return recommendations.slice(0, count);
  }, [getRecommendations, getAvailableLessons, getCategoryPerformance, getAllPerformanceStats]);

  const getNextAfterFailure = useCallback((
    failedDomain: SkillDomain,
    currentLessonId: string,
    count: number = 2
  ): AdaptiveRecommendation[] => {
    const allLessons = getAvailableLessons();
    const recommendations: AdaptiveRecommendation[] = [];
    
    const sameDomainLessons = allLessons
      .filter(l => 
        l.domain === failedDomain && 
        !l.isCompleted && 
        l.lesson.id !== currentLessonId &&
        l.lesson.type === 'lesson'
      );

    for (let i = 0; i < Math.min(count, sameDomainLessons.length); i++) {
      const lesson = sameDomainLessons[i];
      recommendations.push({
        id: `reinforce-${lesson.lesson.id}`,
        type: 'lesson',
        title: lesson.lesson.title,
        subtitle: `Build your ${failedDomain} foundation`,
        moduleId: lesson.module.id,
        lessonId: lesson.lesson.id,
        domain: failedDomain,
        priority: 1.0 - (i * 0.1),
        reason: 'Reinforcement for recent challenge',
        isExploration: false,
        estimatedMinutes: lesson.lesson.estimatedMinutes,
      });
    }

    if (recommendations.length < count) {
      const otherRecs = getRecommendations(count - recommendations.length, [failedDomain]);
      for (const rec of otherRecs) {
        const domainLessons = allLessons
          .filter(l => l.domain === rec.domain && !l.isCompleted);
        
        if (domainLessons.length > 0) {
          const lesson = domainLessons[0];
          recommendations.push({
            id: `alt-${lesson.lesson.id}`,
            type: lesson.lesson.type === 'quiz' ? 'quiz' : 'lesson',
            title: lesson.lesson.title,
            subtitle: lesson.module.title,
            moduleId: lesson.module.id,
            lessonId: lesson.lesson.id,
            domain: rec.domain,
            priority: rec.score * 0.8,
            reason: 'Try something different while building confidence',
            isExploration: true,
            estimatedMinutes: lesson.lesson.estimatedMinutes,
          });
        }
      }
    }

    return recommendations.slice(0, count);
  }, [getAvailableLessons, getRecommendations]);

  const getLearningPath = useCallback((targetDomain?: SkillDomain): AdaptiveRecommendation[] => {
    const allLessons = getAvailableLessons();
    const stats = getAllPerformanceStats();
    
    const targetDomains = targetDomain 
      ? [targetDomain]
      : stats
          .sort((a, b) => a.recentTrend - b.recentTrend)
          .map(s => s.domain)
          .slice(0, 3);

    const path: AdaptiveRecommendation[] = [];
    
    for (const domain of targetDomains) {
      const domainLessons = allLessons
        .filter(l => l.domain === domain && !l.isCompleted)
        .sort((a, b) => {
          if (a.lesson.type === 'lesson' && b.lesson.type !== 'lesson') return -1;
          if (a.lesson.type !== 'lesson' && b.lesson.type === 'lesson') return 1;
          return 0;
        });

      for (let i = 0; i < Math.min(2, domainLessons.length); i++) {
        const lesson = domainLessons[i];
        path.push({
          id: `path-${lesson.lesson.id}`,
          type: lesson.lesson.type === 'quiz' ? 'quiz' : 'lesson',
          title: lesson.lesson.title,
          subtitle: lesson.module.title,
          moduleId: lesson.module.id,
          lessonId: lesson.lesson.id,
          domain,
          priority: 1.0 - (path.length * 0.05),
          reason: `Recommended for ${domain} mastery`,
          isExploration: false,
          estimatedMinutes: lesson.lesson.estimatedMinutes,
        });
      }
    }

    return path;
  }, [getAvailableLessons, getAllPerformanceStats]);

  return {
    isLoading: banditLoading || progressLoading,
    generateRecommendations,
    getNextAfterFailure,
    getLearningPath,
    getAllPerformanceStats,
  };
}
