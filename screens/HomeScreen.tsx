import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ProgressBar } from "@/components/ProgressBar";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useUserData } from "@/hooks/useUserData";
import { useModuleProgress } from "@/hooks/useModuleProgress";
import { useAdaptiveRecommendations, AdaptiveRecommendation } from "@/hooks/useAdaptiveRecommendations";
import { courses } from "../mock/courses";
import { Course, LessonModule } from "@/types";

type RootTabParamList = {
  HomeTab: undefined;
  LearnTab: { screen: string; params: object };
  ChallengesTab: { screen: string; params: object };
  SocialTab: undefined;
  ProfileTab: undefined;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const { theme } = useTheme();
  const { profile, financial } = useUserData();
  const { moduleProgress, getLessonProgress, reload: reloadModuleProgress } = useModuleProgress();
  const { generateRecommendations, isLoading: recommendationsLoading, getAllPerformanceStats } = useAdaptiveRecommendations();

  useFocusEffect(
    useCallback(() => {
      reloadModuleProgress();
    }, [reloadModuleProgress])
  );

  const continueLesson = useMemo(() => {
    type ContinueActivity = {
      course: Course;
      lesson: Course['lessons'][number];
      module: LessonModule;
      moduleIndex: number;
      progress: number;
      completedModules: number;
      totalModules: number;
    };

    let latest: (ContinueActivity & { timestamp: number }) | null = null;

    for (const course of courses) {
      for (const lesson of course.lessons) {
        const modules = lesson.modules || [];
        if (modules.length === 0) continue;

        for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
          const module = modules[moduleIndex];
          const progress = moduleProgress[module.id];
          if (!progress?.lastAttemptDate) continue;
          const timestamp = new Date(progress.lastAttemptDate).getTime();
          if (!Number.isFinite(timestamp)) continue;

          const lessonProgress = getLessonProgress(lesson.id, modules);
          const completedModules = Object.values(lessonProgress.moduleProgress).filter(
            (m) => m.status === 'completed'
          ).length;

          if (!latest || timestamp > latest.timestamp) {
            latest = {
              course,
              lesson,
              module,
              moduleIndex,
              timestamp,
              completedModules,
              totalModules: modules.length,
              progress: modules.length > 0 ? completedModules / modules.length : 0,
            };
          }
        }
      }
    }

    if (latest) {
      const modules = latest.lesson.modules || [];
      const firstIncompleteIndex = modules.findIndex((m) => {
        const p = moduleProgress[m.id];
        return !p || p.status !== 'completed';
      });
      const targetIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : latest.moduleIndex;
      const targetModule = modules[targetIndex] || latest.module;

      return {
        ...latest,
        module: targetModule,
        moduleIndex: targetIndex,
      };
    }

    // Fallback: first unstarted module in first incomplete lesson
    for (const course of courses) {
      for (const lesson of course.lessons) {
        const modules = lesson.modules || [];
        if (modules.length === 0) continue;
        const lessonProgress = getLessonProgress(lesson.id, modules);
        if (lessonProgress.overallStatus === 'completed' && lessonProgress.canProceed) continue;

        const firstIncompleteIndex = modules.findIndex((m) => {
          const p = moduleProgress[m.id];
          return !p || p.status !== 'completed';
        });
        const targetIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
        const completedModules = Object.values(lessonProgress.moduleProgress).filter(
          (m) => m.status === 'completed'
        ).length;

        return {
          course,
          lesson,
          module: modules[targetIndex],
          moduleIndex: targetIndex,
          completedModules,
          totalModules: modules.length,
          progress: modules.length > 0 ? completedModules / modules.length : 0,
        };
      }
    }

    return null;
  }, [getLessonProgress, moduleProgress]);

  const adaptiveRecommendations = useMemo(() => {
    if (recommendationsLoading) return [];
    return generateRecommendations(5);
  }, [generateRecommendations, recommendationsLoading]);

  const performanceStats = useMemo(() => getAllPerformanceStats(), [getAllPerformanceStats]);

  const savingsProgress = (financial.currentSavings / financial.savingsGoal) * 100;
  const activeSubscriptions = financial.subscriptions.filter(s => s.active).length;

  const handleRecommendationPress = (rec: AdaptiveRecommendation) => {
    // @ts-ignore - nested navigation typing is complex
    navigation.navigate('LearnTab', {
      screen: 'Lesson',
      params: { lessonId: rec.lessonId, moduleId: rec.moduleId },
    });
  };

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.cardTitle}>Financial Snapshot</ThemedText>

        <View style={styles.snapshotGrid}>
          <View style={styles.snapshotItem}>
            <ThemedText style={[styles.snapshotLabel, { color: theme.textSecondary }]}>
              Monthly Income
            </ThemedText>
            <ThemedText style={styles.snapshotValue}>
              £{financial.monthlyIncome.toLocaleString()}
            </ThemedText>
          </View>

          <View style={styles.snapshotItem}>
            <ThemedText style={[styles.snapshotLabel, { color: theme.textSecondary }]}>
              Total Debt
            </ThemedText>
            <ThemedText style={styles.snapshotValue}>
              £{financial.totalDebt.toLocaleString()}
            </ThemedText>
          </View>

          <View style={styles.snapshotItem}>
            <ThemedText style={[styles.snapshotLabel, { color: theme.textSecondary }]}>
              Subscriptions
            </ThemedText>
            <ThemedText style={styles.snapshotValue}>{activeSubscriptions}</ThemedText>
          </View>

          <View style={styles.snapshotItem}>
            <ThemedText style={[styles.snapshotLabel, { color: theme.textSecondary }]}>
              Savings Goal
            </ThemedText>
            <ThemedText style={styles.snapshotValue}>{Math.round(savingsProgress)}%</ThemedText>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.snapshotButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => navigation.navigate('ProfileTab' as never)}
        >
          <ThemedText style={[styles.snapshotButtonText, { color: theme.primary }]}>
            View Details
          </ThemedText>
          <Feather name="chevron-right" size={20} color={theme.primary} />
        </Pressable>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      {continueLesson ? (
        <>
          <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText style={styles.cardTitle}>Continue Learning</ThemedText>
            <Spacer height={Spacing.md} />

            <ThemedText style={styles.lessonTitle}>
              {continueLesson.course.title}: {continueLesson.lesson.title}
            </ThemedText>
            <ThemedText style={[styles.lessonMeta, { color: theme.textSecondary }]}>
              {continueLesson.module.type === 'quiz'
                ? 'Quiz'
                : `Reading ${continueLesson.moduleIndex + 1}`} · {continueLesson.lesson.estimatedMinutes} min
            </ThemedText>
            <ThemedText style={[styles.lessonMeta, { color: theme.textSecondary }]}>
              {continueLesson.completedModules}/{continueLesson.totalModules} modules completed
            </ThemedText>

            <Spacer height={Spacing.md} />
            <ProgressBar progress={continueLesson.progress} />

            <Spacer height={Spacing.lg} />

            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                // Route through CourseDetail first so back stack remains:
                // Module -> CourseDetail -> Learn.
                // @ts-ignore - nested navigation typing is complex
                navigation.navigate('LearnTab', {
                  screen: 'CourseDetail',
                  params: {
                    courseId: continueLesson.course.id,
                    resumeLessonId: continueLesson.lesson.id,
                    resumeModuleId: continueLesson.module.id,
                  },
                });
              }}
            >
              <ThemedText style={[styles.primaryButtonText, { color: theme.buttonText }]}>
                Resume
              </ThemedText>
            </Pressable>
          </ThemedView>

          <Spacer height={Spacing.lg} />
        </>
      ) : null}

      <ThemedText style={styles.sectionTitle}>Recommended for you</ThemedText>
      <Spacer height={Spacing.md} />

      {recommendationsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendationsContainer}
        >
          {adaptiveRecommendations.map((rec, index) => (
            <Pressable
              key={rec.id}
              style={[
                styles.recommendationCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                index !== 0 && styles.recommendationCardSpacing,
              ]}
              onPress={() => handleRecommendationPress(rec)}
            >
              <View style={styles.tagRow}>
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor:
                        rec.type === 'lesson'
                          ? theme.primary + '20'
                          : rec.type === 'quiz'
                          ? theme.success + '20'
                          : rec.type === 'review'
                          ? theme.warning + '20'
                          : theme.primary + '20',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.tagText,
                      {
                        color:
                          rec.type === 'lesson'
                            ? theme.primary
                            : rec.type === 'quiz'
                            ? theme.success
                            : rec.type === 'review'
                            ? theme.warning
                            : theme.primary,
                      },
                    ]}
                  >
                    {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}
                  </ThemedText>
                </View>

                {rec.isExploration ? (
                  <View style={[styles.explorationBadge, { backgroundColor: theme.warning + '20' }]}>
                    <Feather name="compass" size={12} color={theme.warning} />
                  </View>
                ) : null}
              </View>

              <Spacer height={Spacing.md} />

              <ThemedText style={styles.recommendationTitle} numberOfLines={2}>
                {rec.title}
              </ThemedText>

              <ThemedText
                style={[styles.recommendationDescription, { color: theme.textSecondary }]}
                numberOfLines={2}
              >
                {rec.reason}
              </ThemedText>

              <View style={styles.metaRow}>
                <Feather name="clock" size={14} color={theme.textSecondary} />
                <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                  {rec.estimatedMinutes} min
                </ThemedText>
              </View>

              <Spacer height={Spacing.md} />

              <View style={[styles.startButton, { borderColor: theme.primary }]}>
                <ThemedText style={[styles.startButtonText, { color: theme.primary }]}>
                  Start
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Spacer height={Spacing['2xl']} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  cardTitle: {
    ...Typography.title,
    marginBottom: Spacing.lg,
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  snapshotItem: {
    flex: 1,
    minWidth: '45%',
  },
  snapshotLabel: {
    ...Typography.footnote,
    marginBottom: Spacing.xs,
  },
  snapshotValue: {
    ...Typography.title,
  },
  snapshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  snapshotButtonText: {
    ...Typography.headline,
    marginRight: Spacing.xs,
  },
  lessonTitle: {
    ...Typography.headline,
  },
  lessonMeta: {
    ...Typography.footnote,
    marginTop: Spacing.xs,
  },
  primaryButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.headline,
  },
  sectionTitle: {
    ...Typography.title,
    marginHorizontal: Spacing.lg,
  },
  recommendationsContainer: {
    paddingHorizontal: Spacing.lg,
  },
  recommendationCard: {
    width: 280,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  recommendationCardSpacing: {
    marginLeft: Spacing.md,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  tagText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  recommendationTitle: {
    ...Typography.headline,
    marginBottom: Spacing.sm,
  },
  recommendationDescription: {
    ...Typography.subhead,
    flex: 1,
  },
  startButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  startButtonText: {
    ...Typography.headline,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  explorationBadge: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  metaText: {
    ...Typography.caption,
  },
});
