import { useState, useCallback } from 'react';
import { 
  generatePersonalizedQuestion, 
  generatePersonalizedInsight,
  canGenerateAIQuestions,
  QuestionGenerationRequest,
  UserFinancialContext
} from '@/services/aiQuestionService';
import { Question, DifficultyLevel, SkillDomain } from '@/types';
import { useUserData } from './useUserData';

export function useAIQuestions() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { financial } = useUserData();

  const isAvailable = canGenerateAIQuestions();

  const getUserContext = useCallback((): UserFinancialContext => {
    if (!financial) return {};

    return {
      monthlyIncome: financial.monthlyIncome,
      monthlyExpenses: financial.monthlyExpenses,
      savingsGoal: financial.savingsGoal,
      currentSavings: financial.currentSavings,
      monthlyDebt: financial.totalDebt,
      subscriptionCount: financial.subscriptions?.length,
    };
  }, [financial]);

  const generateQuestion = useCallback(async (
    conceptId: string,
    conceptName: string,
    domain: SkillDomain,
    difficulty: DifficultyLevel,
    lessonTitle: string,
    lessonContent: string,
    existingQuestionIds: string[] = []
  ): Promise<Question | null> => {
    if (!isAvailable) {
      setError('AI question generation is not available. Please configure the Gemini API key.');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const request: QuestionGenerationRequest = {
        conceptId,
        conceptName,
        domain,
        difficulty,
        lessonTitle,
        lessonContent,
        userContext: getUserContext(),
        existingQuestionIds,
      };

      const question = await generatePersonalizedQuestion(request);
      return question;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate question';
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [isAvailable, getUserContext]);

  const generateInsight = useCallback(async (topic: string): Promise<string | null> => {
    if (!isAvailable) {
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const userContext = getUserContext();
      const insight = await generatePersonalizedInsight(userContext, topic);
      return insight;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate insight';
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [isAvailable, getUserContext]);

  return {
    isAvailable,
    isGenerating,
    error,
    generateQuestion,
    generateInsight,
  };
}
