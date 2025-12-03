import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useNavigation } from '@react-navigation/native';
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
import { modules } from "../mock/modules";
import { recommendations } from "../mock/recommendations";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { profile, financial } = useUserData();
  const { getLessonStatus } = useLearningProgress();

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

  const savingsProgress = (financial.currentSavings / financial.savingsGoal) * 100;
  const activeSubscriptions = financial.subscriptions.filter(s => s.active).length;

  const handleRecommendationPress = (rec: typeof recommendations[0]) => {
    if (rec.kind === 'lesson') {
      const module = modules.find(m => m.lessons.some(l => l.id === rec.linkedId));
      if (module) {
        navigation.navigate('LearnTab' as never, {
          screen: 'Lesson',
          params: { lessonId: rec.linkedId, moduleId: module.id },
        } as never);
      }
    } else if (rec.kind === 'challenge') {
      navigation.navigate('ChallengesTab' as never, {
        screen: 'ChallengeDetail',
        params: { challengeId: rec.linkedId },
      } as never);
    }
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
              onPress={() =>
                navigation.navigate('LearnTab' as never, {
                  screen: 'Lesson',
                  params: {
                    lessonId: continueLesson.lesson.id,
                    moduleId: continueLesson.module.id,
                  },
                } as never)
              }
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recommendationsContainer}
      >
        {recommendations.map((rec, index) => (
          <Pressable
            key={rec.id}
            style={[
              styles.recommendationCard,
              { backgroundColor: theme.card, borderColor: theme.border },
              index !== 0 && styles.recommendationCardSpacing,
            ]}
            onPress={() => handleRecommendationPress(rec)}
          >
            <View
              style={[
                styles.tag,
                {
                  backgroundColor:
                    rec.kind === 'lesson'
                      ? theme.primary + '20'
                      : rec.kind === 'challenge'
                      ? theme.success + '20'
                      : theme.warning + '20',
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.tagText,
                  {
                    color:
                      rec.kind === 'lesson'
                        ? theme.primary
                        : rec.kind === 'challenge'
                        ? theme.success
                        : theme.warning,
                  },
                ]}
              >
                {rec.kind.charAt(0).toUpperCase() + rec.kind.slice(1)}
              </ThemedText>
            </View>

            <Spacer height={Spacing.md} />

            <ThemedText style={styles.recommendationTitle} numberOfLines={2}>
              {rec.title}
            </ThemedText>

            <ThemedText
              style={[styles.recommendationDescription, { color: theme.textSecondary }]}
              numberOfLines={3}
            >
              {rec.shortDescription}
            </ThemedText>

            <Spacer height={Spacing.md} />

            <View style={[styles.startButton, { borderColor: theme.primary }]}>
              <ThemedText style={[styles.startButtonText, { color: theme.primary }]}>
                Start
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Spacer height={Spacing.xl} />

      <ThemedText style={styles.sectionTitle}>Community Achievements</ThemedText>
      <Spacer height={Spacing.md} />

      <View style={styles.achievementsContainer}>
        {mockCommunityAchievements.map((achievement) => (
          <Pressable
            key={achievement.id}
            style={({ pressed }) => [
              styles.achievementCard,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.achievementHeader}>
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: theme.primary + '15' },
                ]}
              >
                <ThemedText style={styles.avatarText}>{achievement.name.charAt(0)}</ThemedText>
              </View>
              <View style={styles.achievementInfo}>
                <ThemedText style={styles.achievementName}>{achievement.name}</ThemedText>
                <ThemedText style={[styles.achievementAction, { color: theme.textSecondary }]}>
                  {achievement.action}
                </ThemedText>
              </View>
            </View>
            <View style={styles.achievementBadge}>
              <Feather name="award" size={16} color={theme.primary} />
              <ThemedText style={[styles.badgeText, { color: theme.primary }]}>
                {achievement.badge}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.shareButton,
          { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => alert('Share your achievements with friends!')}
      >
        <Feather name="share-2" size={20} color={theme.primary} />
        <ThemedText style={[styles.shareButtonText, { color: theme.primary }]}>
          Share Your Achievement
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing['2xl']} />
    </ScreenScrollView>
  );
}

const mockCommunityAchievements = [
  { id: '1', name: 'Sarah', action: 'Completed "Budgeting Basics"', badge: 'Quiz Master' },
  { id: '2', name: 'James', action: 'Canceled 3 subscriptions', badge: 'Money Saver' },
  { id: '3', name: 'Emma', action: 'Reached 50% savings goal', badge: 'Goal Getter' },
];

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
  achievementsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  achievementCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    ...Typography.headline,
    fontWeight: '600',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    ...Typography.headline,
    marginBottom: Spacing.xs,
  },
  achievementAction: {
    ...Typography.footnote,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: Spacing.md,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  shareButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  shareButtonText: {
    ...Typography.headline,
    fontWeight: '600',
  },
});
