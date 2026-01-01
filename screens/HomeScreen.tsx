import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ProgressBar } from "@/components/ProgressBar";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useUserData } from "@/hooks/useUserData";
import { useLearningProgress } from "@/hooks/useLearningProgress";
import { useAdaptiveRecommendations, AdaptiveRecommendation } from "@/hooks/useAdaptiveRecommendations";
import { modules } from "../mock/modules";

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
  const { getLessonStatus } = useLearningProgress();
  const { generateRecommendations, isLoading: recommendationsLoading, getAllPerformanceStats } = useAdaptiveRecommendations();

  const continueLesson = useMemo(() => {
    for (const module of modules) {
      for (const lesson of module.lessons) {
        const status = getLessonStatus(lesson.id);
        if (status === 'in_progress') {
          return { lesson, module };
        }
      }
    }
    for (const module of modules) {
      for (const lesson of module.lessons) {
        const status = getLessonStatus(lesson.id);
        if (status === 'not_started') {
          return { lesson, module };
        }
      }
    }
    return null;
  }, [getLessonStatus]);

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

            <ThemedText style={styles.lessonTitle}>{continueLesson.lesson.title}</ThemedText>
            <ThemedText style={[styles.lessonMeta, { color: theme.textSecondary }]}>
              {continueLesson.module.title} · {continueLesson.lesson.estimatedMinutes} min
            </ThemedText>

            <Spacer height={Spacing.md} />
            <ProgressBar progress={continueLesson.module.progress} />

            <Spacer height={Spacing.lg} />

            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                // @ts-ignore - nested navigation typing is complex
                navigation.navigate('LearnTab', {
                  screen: 'Lesson',
                  params: {
                    lessonId: continueLesson.lesson.id,
                    moduleId: continueLesson.module.id,
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
