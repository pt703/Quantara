import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { geminiService } from '@/lib/gemini';
import { Question, FinancialSnapshot, DifficultyLevel, SkillDomain } from '@/types';

const AI_API_KEY_STORAGE = '@quantara_ai_api_key';
const AI_ENABLED_STORAGE = '@quantara_ai_enabled';

interface AISettings {
  apiKey: string;
  isEnabled: boolean;
}

interface UseAIReturn {
  isConfigured: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  configureApiKey: (key: string) => Promise<boolean>;
  setEnabled: (enabled: boolean) => Promise<void>;
  generateQuestion: (
    topic: string,
    conceptId: string,
    difficulty: DifficultyLevel,
    domain: SkillDomain,
    financialSnapshot?: FinancialSnapshot,
    questionType?: 'mcq' | 'true_false' | 'calculation' | 'scenario'
  ) => Promise<Question | null>;
  generateQuizQuestions: (
    topic: string,
    conceptId: string,
    domain: SkillDomain,
    financialSnapshot?: FinancialSnapshot,
    count?: number
  ) => Promise<Question[]>;
  generateInsight: (
    lessonTopic: string,
    financialSnapshot: FinancialSnapshot
  ) => Promise<string>;
  generateFeedback: (
    wasCorrect: boolean,
    question: string,
    userAnswer: string,
    correctAnswer: string,
    financialSnapshot?: FinancialSnapshot
  ) => Promise<string>;
  clearApiKey: () => Promise<void>;
}

export function useAI(): UseAIReturn {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEnabled, setIsEnabledState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const [savedKey, savedEnabled] = await Promise.all([
        AsyncStorage.getItem(AI_API_KEY_STORAGE),
        AsyncStorage.getItem(AI_ENABLED_STORAGE),
      ]);

      if (savedKey) {
        geminiService.setApiKey(savedKey);
        setIsConfigured(true);
      }

      setIsEnabledState(savedEnabled === 'true');
    } catch (err) {
      console.error('Error loading AI settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const configureApiKey = useCallback(async (key: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      geminiService.setApiKey(key);
      
      try {
        await geminiService.generatePersonalizedInsight(
          'budgeting basics',
          { monthlyIncome: 3000, monthlyExpenses: 2500 } as FinancialSnapshot
        );
      } catch (testError: any) {
        setError('Invalid API key. Please check and try again.');
        geminiService.setApiKey('');
        return false;
      }

      await AsyncStorage.setItem(AI_API_KEY_STORAGE, key);
      await AsyncStorage.setItem(AI_ENABLED_STORAGE, 'true');
      
      setIsConfigured(true);
      setIsEnabledState(true);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to configure API key');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    await AsyncStorage.setItem(AI_ENABLED_STORAGE, enabled ? 'true' : 'false');
    setIsEnabledState(enabled);
  }, []);

  const clearApiKey = useCallback(async () => {
    await AsyncStorage.removeItem(AI_API_KEY_STORAGE);
    await AsyncStorage.setItem(AI_ENABLED_STORAGE, 'false');
    geminiService.setApiKey('');
    setIsConfigured(false);
    setIsEnabledState(false);
  }, []);

  const generateQuestion = useCallback(async (
    topic: string,
    conceptId: string,
    difficulty: DifficultyLevel,
    domain: SkillDomain,
    financialSnapshot?: FinancialSnapshot,
    questionType: 'mcq' | 'true_false' | 'calculation' | 'scenario' = 'mcq'
  ): Promise<Question | null> => {
    if (!isConfigured || !isEnabled) return null;
    
    try {
      setError(null);
      return await geminiService.generatePersonalizedQuestion(
        topic,
        conceptId,
        difficulty,
        domain,
        financialSnapshot,
        questionType
      );
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [isConfigured, isEnabled]);

  const generateQuizQuestions = useCallback(async (
    topic: string,
    conceptId: string,
    domain: SkillDomain,
    financialSnapshot?: FinancialSnapshot,
    count: number = 3
  ): Promise<Question[]> => {
    if (!isConfigured || !isEnabled) return [];
    
    try {
      setError(null);
      return await geminiService.generateQuizQuestions(
        topic,
        conceptId,
        domain,
        financialSnapshot,
        count
      );
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [isConfigured, isEnabled]);

  const generateInsight = useCallback(async (
    lessonTopic: string,
    financialSnapshot: FinancialSnapshot
  ): Promise<string> => {
    if (!isConfigured || !isEnabled) {
      return `This lesson on ${lessonTopic} will help you build better financial habits.`;
    }
    
    try {
      setError(null);
      return await geminiService.generatePersonalizedInsight(lessonTopic, financialSnapshot);
    } catch (err: any) {
      setError(err.message);
      return `This lesson on ${lessonTopic} will help you build better financial habits.`;
    }
  }, [isConfigured, isEnabled]);

  const generateFeedback = useCallback(async (
    wasCorrect: boolean,
    question: string,
    userAnswer: string,
    correctAnswer: string,
    financialSnapshot?: FinancialSnapshot
  ): Promise<string> => {
    if (!isConfigured || !isEnabled) {
      return wasCorrect 
        ? 'Great job! You got it right!' 
        : `The correct answer was ${correctAnswer}. Keep learning!`;
    }
    
    try {
      setError(null);
      return await geminiService.generateAdaptiveFeedback(
        wasCorrect,
        question,
        userAnswer,
        correctAnswer,
        financialSnapshot
      );
    } catch (err: any) {
      setError(err.message);
      return wasCorrect 
        ? 'Great job! You got it right!' 
        : `The correct answer was ${correctAnswer}. Keep learning!`;
    }
  }, [isConfigured, isEnabled]);

  return {
    isConfigured,
    isEnabled,
    isLoading,
    error,
    configureApiKey,
    setEnabled,
    generateQuestion,
    generateQuizQuestions,
    generateInsight,
    generateFeedback,
    clearApiKey,
  };
}
