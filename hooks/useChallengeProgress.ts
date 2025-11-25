import { useCallback } from 'react';
import { useStorage } from './useStorage';
import { ChallengeStatus } from '../types';

type ChallengeProgressMap = Record<string, ChallengeStatus>;

export function useChallengeProgress() {
  const [progress, setProgress, loading] = useStorage<ChallengeProgressMap>(
    'challenge_progress',
    {}
  );

  const getChallengeStatus = useCallback(
    (challengeId: string): ChallengeStatus => {
      return progress[challengeId] || 'not_started';
    },
    [progress]
  );

  const setChallengeStatus = useCallback(
    async (challengeId: string, status: ChallengeStatus) => {
      await setProgress((prev) => ({
        ...prev,
        [challengeId]: status,
      }));
    },
    [setProgress]
  );

  return {
    getChallengeStatus,
    setChallengeStatus,
    loading,
  };
}
