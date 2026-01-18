import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkillDomain } from '../types';

const SKILL_ACCURACY_KEY = '@quantara_skill_accuracy';

export interface SkillAccuracyData {
  correct: number;
  total: number;
}

export interface SkillAccuracyState {
  budgeting: SkillAccuracyData;
  saving: SkillAccuracyData;
  debt: SkillAccuracyData;
  investing: SkillAccuracyData;
  credit: SkillAccuracyData;
}

const DEFAULT_ACCURACY: SkillAccuracyState = {
  budgeting: { correct: 0, total: 0 },
  saving: { correct: 0, total: 0 },
  debt: { correct: 0, total: 0 },
  investing: { correct: 0, total: 0 },
  credit: { correct: 0, total: 0 },
};

export function useSkillAccuracy() {
  const [accuracy, setAccuracy] = useState<SkillAccuracyState>(DEFAULT_ACCURACY);
  const [isLoading, setIsLoading] = useState(true);

  const loadAccuracy = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SKILL_ACCURACY_KEY);
      if (stored) {
        setAccuracy(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load skill accuracy:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveAccuracy = useCallback(async (data: SkillAccuracyState) => {
    try {
      await AsyncStorage.setItem(SKILL_ACCURACY_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save skill accuracy:', error);
    }
  }, []);

  useEffect(() => {
    loadAccuracy();
  }, [loadAccuracy]);

  const recordQuizResult = useCallback((
    domain: SkillDomain,
    correct: number,
    total: number
  ) => {
    setAccuracy(prev => {
      const updated = {
        ...prev,
        [domain]: {
          correct: prev[domain].correct + correct,
          total: prev[domain].total + total,
        },
      };
      saveAccuracy(updated);
      return updated;
    });
  }, [saveAccuracy]);

  const getAccuracyPercentage = useCallback((domain: SkillDomain): number => {
    const data = accuracy[domain];
    if (data.total === 0) return 0;
    return Math.round((data.correct / data.total) * 100);
  }, [accuracy]);

  const getAccuracyDisplay = useCallback((domain: SkillDomain): string => {
    const data = accuracy[domain];
    return `${data.correct}/${data.total}`;
  }, [accuracy]);

  const reload = useCallback(async () => {
    await loadAccuracy();
  }, [loadAccuracy]);

  const resetAll = useCallback(async () => {
    setAccuracy(DEFAULT_ACCURACY);
    await AsyncStorage.removeItem(SKILL_ACCURACY_KEY);
  }, []);

  return {
    accuracy,
    isLoading,
    recordQuizResult,
    getAccuracyPercentage,
    getAccuracyDisplay,
    reload,
    resetAll,
  };
}

export default useSkillAccuracy;
