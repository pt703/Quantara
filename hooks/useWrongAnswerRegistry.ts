// =============================================================================
// WRONG ANSWER REGISTRY HOOK
// =============================================================================
// 
// Tracks concepts users have failed and schedules remediation.
// When a user answers a question wrong:
// 1. The concept is registered with the failed question format
// 2. A variant question (different format) is scheduled for remediation
// 3. User cannot progress until they correctly answer the variant
//
// This implements mastery-based learning - ensuring users truly understand
// concepts before moving forward.
//
// =============================================================================

import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WrongAnswerEntry, QuestionType } from '../types';

// Storage key for persisting registry
const WRONG_ANSWER_REGISTRY_KEY = '@quantara_wrong_answer_registry';

// Interface for the hook's return value
export interface UseWrongAnswerRegistryReturn {
  // Current wrong answers requiring remediation
  wrongAnswers: WrongAnswerEntry[];
  
  // Add a wrong answer to the registry
  registerWrongAnswer: (
    questionId: string,
    conceptId: string,
    questionType: QuestionType,
    lessonId: string,
    variantQuestionId?: string
  ) => void;
  
  // Mark a concept as remediated (user answered variant correctly)
  markRemediated: (conceptId: string) => void;
  
  // Check if a concept needs remediation
  needsRemediation: (conceptId: string) => boolean;
  
  // Get pending remediation items for a lesson
  getRemediationForLesson: (lessonId: string) => WrongAnswerEntry[];
  
  // Get all pending remediation items
  getPendingRemediation: () => WrongAnswerEntry[];
  
  // Clear all remediation (for testing/reset)
  clearRegistry: () => void;
  
  // Check if user can proceed (no blocking remediation)
  canProceed: boolean;
}

export function useWrongAnswerRegistry(): UseWrongAnswerRegistryReturn {
  // State for wrong answer entries
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerEntry[]>([]);
  
  // Load registry from storage on mount
  useEffect(() => {
    loadRegistry();
  }, []);
  
  // Load registry from AsyncStorage
  const loadRegistry = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(WRONG_ANSWER_REGISTRY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WrongAnswerEntry[];
        setWrongAnswers(parsed);
      }
    } catch (error) {
      console.error('Failed to load wrong answer registry:', error);
    }
  }, []);
  
  // Save registry to AsyncStorage
  const saveRegistry = useCallback(async (entries: WrongAnswerEntry[]) => {
    try {
      await AsyncStorage.setItem(
        WRONG_ANSWER_REGISTRY_KEY, 
        JSON.stringify(entries)
      );
    } catch (error) {
      console.error('Failed to save wrong answer registry:', error);
    }
  }, []);
  
  // Register a wrong answer for remediation
  const registerWrongAnswer = useCallback((
    questionId: string,
    conceptId: string,
    questionType: QuestionType,
    lessonId: string,
    variantQuestionId?: string
  ) => {
    setWrongAnswers(prev => {
      // Check if this concept is already registered
      const existingIndex = prev.findIndex(e => e.conceptId === conceptId);
      
      if (existingIndex >= 0) {
        // Update existing entry (user failed again)
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          questionId,
          questionType,
          timestamp: new Date().toISOString(),
          requiresRemediation: true,
          remediationComplete: false,
          variantQuestionId: variantQuestionId || updated[existingIndex].variantQuestionId,
        };
        saveRegistry(updated);
        return updated;
      }
      
      // Add new entry
      const newEntry: WrongAnswerEntry = {
        questionId,
        conceptId,
        questionType,
        timestamp: new Date().toISOString(),
        lessonId,
        requiresRemediation: true,
        remediationComplete: false,
        variantQuestionId,
      };
      
      const updated = [...prev, newEntry];
      saveRegistry(updated);
      return updated;
    });
  }, [saveRegistry]);
  
  // Mark a concept as remediated
  const markRemediated = useCallback((conceptId: string) => {
    setWrongAnswers(prev => {
      const updated = prev.map(entry => {
        if (entry.conceptId === conceptId) {
          return {
            ...entry,
            remediationComplete: true,
            requiresRemediation: false,
          };
        }
        return entry;
      });
      saveRegistry(updated);
      return updated;
    });
  }, [saveRegistry]);
  
  // Check if a concept needs remediation
  const needsRemediation = useCallback((conceptId: string): boolean => {
    return wrongAnswers.some(
      entry => entry.conceptId === conceptId && 
               entry.requiresRemediation && 
               !entry.remediationComplete
    );
  }, [wrongAnswers]);
  
  // Get remediation items for a specific lesson
  const getRemediationForLesson = useCallback((lessonId: string): WrongAnswerEntry[] => {
    return wrongAnswers.filter(
      entry => entry.lessonId === lessonId && 
               entry.requiresRemediation && 
               !entry.remediationComplete
    );
  }, [wrongAnswers]);
  
  // Get all pending remediation items
  const getPendingRemediation = useCallback((): WrongAnswerEntry[] => {
    return wrongAnswers.filter(
      entry => entry.requiresRemediation && !entry.remediationComplete
    );
  }, [wrongAnswers]);
  
  // Clear registry (for testing/reset)
  const clearRegistry = useCallback(() => {
    setWrongAnswers([]);
    AsyncStorage.removeItem(WRONG_ANSWER_REGISTRY_KEY);
  }, []);
  
  // Check if user can proceed (no blocking items)
  const canProceed = wrongAnswers.every(
    entry => !entry.requiresRemediation || entry.remediationComplete
  );
  
  return {
    wrongAnswers,
    registerWrongAnswer,
    markRemediated,
    needsRemediation,
    getRemediationForLesson,
    getPendingRemediation,
    clearRegistry,
    canProceed,
  };
}
