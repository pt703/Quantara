import { useCallback } from 'react';
import { useStorage } from './useStorage';
import { CompletionStatus } from '../types';

type LessonProgressMap = Record<string, CompletionStatus>;

export function useLearningProgress() {
  const [progress, setProgress, loading] = useStorage<LessonProgressMap>(
    'learning_progress',
    {}
  );

  const getLessonStatus = useCallback(
    (lessonId: string): CompletionStatus => {
      return progress[lessonId] || 'not_started';
    },
    [progress]
  );

  const setLessonStatus = useCallback(
    async (lessonId: string, status: CompletionStatus) => {
      await setProgress((prev) => ({
        ...prev,
        [lessonId]: status,
      }));
    },
    [setProgress]
  );

  return {
    getLessonStatus,
    setLessonStatus,
    loading,
  };
}
