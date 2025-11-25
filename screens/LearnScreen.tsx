import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ProgressBar } from '@/components/ProgressBar';
import Spacer from '@/components/Spacer';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { modules } from '../mock/modules';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';

type LearnScreenProps = {
  navigation: NativeStackNavigationProp<LearnStackParamList, 'Learn'>;
};

export default function LearnScreen({ navigation }: LearnScreenProps) {
  const { theme } = useTheme();
  const { getLessonStatus } = useLearningProgress();

  const modulesWithProgress = useMemo(() => {
    return modules.map((module) => {
      const completedLessons = module.lessons.filter(
        (lesson) => getLessonStatus(lesson.id) === 'completed'
      ).length;
      const progress = (completedLessons / module.lessons.length) * 100;

      return {
        ...module,
        progress,
        completedLessons,
      };
    });
  }, [getLessonStatus]);

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />

      {modulesWithProgress.map((module) => (
        <React.Fragment key={module.id}>
          <Pressable
            style={({ pressed }) => [
              styles.moduleCard,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => navigation.navigate('ModuleDetail', { moduleId: module.id })}
          >
            <View style={styles.moduleHeader}>
              <View style={styles.moduleInfo}>
                <ThemedText style={styles.moduleTitle}>{module.title}</ThemedText>
                <ThemedText style={[styles.moduleDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                  {module.description}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={24} color={theme.textSecondary} />
            </View>

            <Spacer height={Spacing.md} />

            <View style={styles.moduleFooter}>
              <ThemedText style={[styles.lessonCount, { color: theme.textSecondary }]}>
                {module.completedLessons} of {module.lessons.length} lessons
              </ThemedText>
              <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
                {Math.round(module.progress)}%
              </ThemedText>
            </View>

            <Spacer height={Spacing.sm} />
            <ProgressBar progress={module.progress} />
          </Pressable>

          <Spacer height={Spacing.lg} />
        </React.Fragment>
      ))}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  moduleCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    ...Typography.headline,
    marginBottom: Spacing.xs,
  },
  moduleDescription: {
    ...Typography.subhead,
  },
  moduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonCount: {
    ...Typography.footnote,
  },
  progressText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
});
