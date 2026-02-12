import { useCallback, useMemo } from 'react';
import { useStorage } from '@/hooks/useStorage';
import { useAuthContext } from '@/context/AuthContext';

function getCertificatesKey(userId: string | null): string {
  return `quantara_course_certificates:${userId || 'guest'}`;
}

export function useCourseCertificates() {
  const { user } = useAuthContext();
  const storageKey = useMemo(() => getCertificatesKey(user?.id || null), [user?.id]);
  const [unlockedCourseIds, setUnlockedCourseIds, isLoading, reload] = useStorage<string[]>(
    storageKey,
    []
  );

  const isCertificateUnlocked = useCallback(
    (courseId: string): boolean => unlockedCourseIds.includes(courseId),
    [unlockedCourseIds]
  );

  const unlockCertificate = useCallback(async (courseId: string): Promise<boolean> => {
    if (!courseId || unlockedCourseIds.includes(courseId)) {
      return false;
    }
    const updated = [...unlockedCourseIds, courseId];
    await setUnlockedCourseIds(updated);
    return true;
  }, [setUnlockedCourseIds, unlockedCourseIds]);

  const resetCertificates = useCallback(async () => {
    await setUnlockedCourseIds([]);
  }, [setUnlockedCourseIds]);

  return {
    unlockedCourseIds,
    isCertificateUnlocked,
    unlockCertificate,
    resetCertificates,
    isLoading,
    reload,
  };
}

export default useCourseCertificates;
