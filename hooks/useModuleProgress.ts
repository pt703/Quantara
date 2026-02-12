// =============================================================================
// MODULE PROGRESS HOOK
// =============================================================================
// 
// Tracks progress through the Coursera-style module structure.
// Handles:
// - Individual module completion status
// - Mastery gating (blocking progression until quiz passed)
// - Lesson-level progress aggregation
// - Integration with wrong answer registry for remediation
//
// =============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '@/context/AuthContext';
import { 
  ModuleProgress, 
  LessonProgress, 
  LessonModule,
  CompletionStatus,
} from '../types';

// Storage key for module progress
const LEGACY_MODULE_PROGRESS_KEY = '@quantara_module_progress';
function getModuleProgressKey(userId: string | null): string {
  return `@quantara_module_progress:${userId || 'guest'}`;
}

// Mastery threshold for quiz modules (80% to pass)
export const DEFAULT_MASTERY_THRESHOLD = 0.8;

// Interface for the hook's return value
export interface UseModuleProgressReturn {
  // All module progress data
  moduleProgress: Record<string, ModuleProgress>;
  
  // Get progress for a specific module
  getModuleProgress: (moduleId: string) => ModuleProgress | undefined;
  
  // Get aggregated lesson progress
  getLessonProgress: (lessonId: string, modules: LessonModule[]) => LessonProgress;
  
  // Complete a reading module
  completeReadingModule: (moduleId: string, xpEarned: number) => void;
  
  // Record quiz attempt with score
  recordQuizAttempt: (
    moduleId: string, 
    score: number, 
    masteryThreshold?: number
  ) => boolean; // Returns true if mastery achieved
  
  // Check if user can access a specific module (gating)
  canAccessModule: (
    moduleId: string, 
    moduleIndex: number, 
    lessonModules: LessonModule[]
  ) => boolean;
  
  // Check if lesson is complete (all modules done)
  isLessonComplete: (lessonId: string, modules: LessonModule[]) => boolean;
  
  // Reset progress for a module (for retry)
  resetModuleProgress: (moduleId: string) => void;
  
  // Clear all progress (for testing/reset)
  clearAllProgress: () => void;
  
  // Reload progress from storage (for reactivity on screen focus)
  reload: () => Promise<void>;
}

export function useModuleProgress(): UseModuleProgressReturn {
  const { user } = useAuthContext();
  const moduleProgressKey = useMemo(() => getModuleProgressKey(user?.id || null), [user?.id]);

  // State for all module progress
  const [moduleProgress, setModuleProgress] = useState<Record<string, ModuleProgress>>({});
  
  // Load progress from AsyncStorage
  const loadProgress = useCallback(async () => {
    try {
      const [scopedStored, legacyStored] = await Promise.all([
        AsyncStorage.getItem(moduleProgressKey),
        AsyncStorage.getItem(LEGACY_MODULE_PROGRESS_KEY),
      ]);

      if (scopedStored) {
        setModuleProgress(JSON.parse(scopedStored));
        return;
      }

      if (legacyStored) {
        const parsed = JSON.parse(legacyStored);
        setModuleProgress(parsed);
        // Migrate one-time to user-scoped key to avoid cross-account leaks.
        await AsyncStorage.setItem(moduleProgressKey, legacyStored);
        await AsyncStorage.removeItem(LEGACY_MODULE_PROGRESS_KEY);
        return;
      }

      setModuleProgress({});
    } catch (error) {
      console.error('Failed to load module progress:', error);
    }
  }, [moduleProgressKey]);
  
  // Save progress to AsyncStorage
  const saveProgress = useCallback(async (progress: Record<string, ModuleProgress>) => {
    try {
      await AsyncStorage.setItem(moduleProgressKey, JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save module progress:', error);
    }
  }, [moduleProgressKey]);
  
  // Get progress for a specific module
  const getModuleProgress = useCallback((moduleId: string): ModuleProgress | undefined => {
    return moduleProgress[moduleId];
  }, [moduleProgress]);
  
  // Get aggregated lesson progress
  const getLessonProgress = useCallback((
    lessonId: string, 
    modules: LessonModule[]
  ): LessonProgress => {
    const moduleProgressMap: Record<string, ModuleProgress> = {};
    let completedCount = 0;
    let allMastered = true;
    
    modules.forEach(module => {
      const progress = moduleProgress[module.id];
      if (progress) {
        moduleProgressMap[module.id] = progress;
        if (progress.status === 'completed') {
          completedCount++;
        }
        if (module.type === 'quiz' && !progress.masteryAchieved) {
          allMastered = false;
        }
      } else {
        // No progress yet
        moduleProgressMap[module.id] = {
          moduleId: module.id,
          status: 'not_started',
          attempts: 0,
          masteryAchieved: false,
        };
        allMastered = false;
      }
    });
    
    // Determine overall status
    let overallStatus: CompletionStatus = 'not_started';
    if (completedCount === modules.length) {
      overallStatus = 'completed';
    } else if (completedCount > 0) {
      overallStatus = 'in_progress';
    }
    
    // Can proceed if all modules complete and mastery achieved
    const canProceed = overallStatus === 'completed' && allMastered;
    
    return {
      lessonId,
      moduleProgress: moduleProgressMap,
      overallStatus,
      canProceed,
    };
  }, [moduleProgress]);
  
  // Complete a reading module
  const completeReadingModule = useCallback((moduleId: string, xpEarned: number) => {
    setModuleProgress(prev => {
      const existing = prev[moduleId];
      const updated: Record<string, ModuleProgress> = {
        ...prev,
        [moduleId]: {
          moduleId,
          status: 'completed',
          attempts: (existing?.attempts || 0) + 1,
          lastAttemptDate: new Date().toISOString(),
          masteryAchieved: true, // Reading modules auto-mastery on completion
        },
      };
      saveProgress(updated);
      return updated;
    });
  }, [saveProgress]);
  
  // Record quiz attempt with score
  const recordQuizAttempt = useCallback((
    moduleId: string,
    score: number,
    masteryThreshold: number = DEFAULT_MASTERY_THRESHOLD
  ): boolean => {
    const masteryAchieved = score >= masteryThreshold * 100;
    
    setModuleProgress(prev => {
      const existing = prev[moduleId];
      const updated: Record<string, ModuleProgress> = {
        ...prev,
        [moduleId]: {
          moduleId,
          status: masteryAchieved ? 'completed' : 'in_progress',
          score,
          attempts: (existing?.attempts || 0) + 1,
          lastAttemptDate: new Date().toISOString(),
          masteryAchieved,
        },
      };
      saveProgress(updated);
      return updated;
    });
    
    return masteryAchieved;
  }, [saveProgress]);
  
  // Check if user can access a specific module (gating logic)
  const canAccessModule = useCallback((
    moduleId: string,
    moduleIndex: number,
    lessonModules: LessonModule[]
  ): boolean => {
    // First module is always accessible
    if (moduleIndex === 0) return true;
    
    // Check if all previous modules are completed
    for (let i = 0; i < moduleIndex; i++) {
      const prevModule = lessonModules[i];
      const prevProgress = moduleProgress[prevModule.id];
      
      if (!prevProgress || prevProgress.status !== 'completed') {
        return false;
      }
      
      // For quiz modules, also check mastery
      if (prevModule.type === 'quiz' && !prevProgress.masteryAchieved) {
        return false;
      }
    }
    
    return true;
  }, [moduleProgress]);
  
  // Check if lesson is complete
  const isLessonComplete = useCallback((
    lessonId: string,
    modules: LessonModule[]
  ): boolean => {
    return modules.every(module => {
      const progress = moduleProgress[module.id];
      if (!progress || progress.status !== 'completed') return false;
      if (module.type === 'quiz' && !progress.masteryAchieved) return false;
      return true;
    });
  }, [moduleProgress]);
  
  // Reset progress for a module
  const resetModuleProgress = useCallback((moduleId: string) => {
    setModuleProgress(prev => {
      const updated = { ...prev };
      delete updated[moduleId];
      saveProgress(updated);
      return updated;
    });
  }, [saveProgress]);
  
  // Clear all progress
  const clearAllProgress = useCallback(() => {
    setModuleProgress({});
    AsyncStorage.multiRemove([moduleProgressKey, LEGACY_MODULE_PROGRESS_KEY]);
  }, [moduleProgressKey]);

  // Reload when account context changes.
  useEffect(() => {
    setModuleProgress({});
    loadProgress();
  }, [loadProgress]);
  
  return {
    moduleProgress,
    getModuleProgress,
    getLessonProgress,
    completeReadingModule,
    recordQuizAttempt,
    canAccessModule,
    isLessonComplete,
    resetModuleProgress,
    clearAllProgress,
    reload: loadProgress,
  };
}
