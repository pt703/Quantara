import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '@/context/AuthContext';

export type LearningMode = 'adaptive' | 'static';

function getLearningModeKey(userId: string | null): string {
  return `learning_mode:${userId || 'guest'}`;
}

export function useLearningMode() {
  const { user } = useAuthContext();
  const userId = user?.id || null;
  const [mode, setModeState] = useState<LearningMode>('adaptive');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMode() {
      try {
        setLoading(true);
        const key = getLearningModeKey(userId);
        const stored = await AsyncStorage.getItem(key);
        const parsed = stored === 'static' ? 'static' : 'adaptive';
        if (!cancelled) setModeState(parsed);
      } catch {
        if (!cancelled) setModeState('adaptive');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMode();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setMode = useCallback(async (nextMode: LearningMode) => {
    setModeState(nextMode);
    const key = getLearningModeKey(userId);
    await AsyncStorage.setItem(key, nextMode);
  }, [userId]);

  const isAdaptive = useMemo(() => mode === 'adaptive', [mode]);
  const isStatic = useMemo(() => mode === 'static', [mode]);

  return {
    mode,
    setMode,
    isAdaptive,
    isStatic,
    loading,
  };
}

