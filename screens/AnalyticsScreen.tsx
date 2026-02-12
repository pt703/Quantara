import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ProgressBar } from "@/components/ProgressBar";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAdaptiveLearning } from "@/hooks/useAdaptiveLearning";
import { useSkillAccuracy } from "@/hooks/useSkillAccuracy";
import useGamification from "@/hooks/useGamification";
import { courses } from "../mock/courses";
import { SkillDomain } from "@/types";

const { width: screenWidth } = Dimensions.get("window");
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DOMAIN_LABELS: Record<SkillDomain, string> = {
  budgeting: "Budgeting",
  debt: "Debt",
  investing: "Investing",
  saving: "Saving",
  credit: "Credit",
};

const DOMAIN_ICONS: Record<SkillDomain, keyof typeof Feather.glyphMap> = {
  budgeting: "pie-chart",
  debt: "trending-down",
  investing: "trending-up",
  saving: "dollar-sign",
  credit: "credit-card",
};

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const { streak, longestStreak, activeDays, xp, reload: reloadGamification } = useGamification();
  const {
    getCourseProgress,
    getOverallProgress,
    lessonAttempts,
    reload: reloadAdaptive,
  } = useAdaptiveLearning(streak);
  const { accuracy: skillAccuracy, reload: reloadSkillAccuracy } = useSkillAccuracy();

  useFocusEffect(
    useCallback(() => {
      void Promise.all([reloadGamification(), reloadAdaptive(), reloadSkillAccuracy()]);
    }, [reloadGamification, reloadAdaptive, reloadSkillAccuracy])
  );

  const stats = useMemo(() => {
    const overallProgress = getOverallProgress();

    // Keep only first attempt per lesson so repeated quiz reviews do not
    // skew benchmark metrics.
    const firstAttemptsByLesson = new Map<string, number>();
    lessonAttempts.forEach((attempt) => {
      if (!firstAttemptsByLesson.has(attempt.lessonId)) {
        firstAttemptsByLesson.set(attempt.lessonId, attempt.accuracy);
      }
    });

    const firstAttemptAccuracies = Array.from(firstAttemptsByLesson.values());
    const successRate =
      firstAttemptAccuracies.length > 0
        ? Math.round(
            (firstAttemptAccuracies.reduce((sum, value) => sum + value, 0) /
              firstAttemptAccuracies.length) *
              100
          )
        : 0;

    return {
      completedLessons: overallProgress.lessonsCompleted,
      totalLessons: overallProgress.totalLessons,
      completedQuizzes: overallProgress.lessonsCompleted,
      quizAttempts: firstAttemptAccuracies.length,
      successRate,
    };
  }, [getOverallProgress, lessonAttempts]);

  const domainPerformance = useMemo(() => {
    const domains: SkillDomain[] = ["budgeting", "saving", "debt", "credit", "investing"];
    return domains.map((domain) => {
      const data = skillAccuracy[domain];
      const total = data.total;
      const avgScore = total > 0 ? Math.round((data.correct / total) * 100) : 0;
      return {
        domain,
        label: DOMAIN_LABELS[domain],
        icon: DOMAIN_ICONS[domain],
        attempts: total,
        avgScore,
      };
    });
  }, [skillAccuracy]);

  const weeklyActivity = useMemo(() => {
    const today = new Date();
    const weekData: { day: string; active: boolean; date: string }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayIndex = date.getDay();
      
      weekData.push({
        day: DAY_NAMES[dayIndex],
        active: activeDays.includes(dateStr),
        date: dateStr,
      });
    }
    
    return weekData;
  }, [activeDays]);

  const activeDaysThisWeek = weeklyActivity.filter((d) => d.active).length;

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.lg} />

      <View style={styles.statsRow}>
        <ThemedView style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="activity" size={20} color={theme.primary} />
          </View>
          <ThemedText style={styles.statValue}>{stats.quizAttempts}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Quiz Attempts</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.success + "15" }]}>
            <Feather name="book-open" size={20} color={theme.success} />
          </View>
          <ThemedText style={styles.statValue}>{stats.completedLessons}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Lessons Done</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.warning + "15" }]}>
            <Feather name="percent" size={20} color={theme.warning} />
          </View>
          <ThemedText style={styles.statValue}>{stats.successRate}%</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Success Rate</ThemedText>
        </ThemedView>
      </View>

      <Spacer height={Spacing.xl} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.streakHeader}>
          <View>
            <ThemedText style={styles.cardTitle}>Streaks</ThemedText>
            <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Keep learning every day
            </ThemedText>
          </View>
        </View>
        <Spacer height={Spacing.lg} />
        
        <View style={styles.streakRow}>
          <View style={[styles.streakCard, { backgroundColor: "#F9731615" }]}>
            <Ionicons name="flame-outline" size={24} color="#F97316" />
            <ThemedText style={[styles.streakValue, { color: "#F97316" }]}>{streak}</ThemedText>
            <ThemedText style={[styles.streakLabel, { color: theme.textSecondary }]}>Current</ThemedText>
          </View>
          <View style={[styles.streakCard, { backgroundColor: "#F9731615" }]}>
            <Ionicons name="flame-outline" size={24} color="#F97316" />
            <ThemedText style={[styles.streakValue, { color: "#F97316" }]}>{longestStreak}</ThemedText>
            <ThemedText style={[styles.streakLabel, { color: theme.textSecondary }]}>Highest</ThemedText>
          </View>
          <View style={[styles.streakCard, { backgroundColor: theme.warning + "15" }]}>
            <Feather name="zap" size={24} color="#EAB308" />
            <ThemedText style={[styles.streakValue, { color: "#EAB308" }]}>{xp}</ThemedText>
            <ThemedText style={[styles.streakLabel, { color: theme.textSecondary }]}>Total XP</ThemedText>
          </View>
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.weeklyHeader}>
          <View>
            <ThemedText style={styles.cardTitle}>Weekly Activity</ThemedText>
            <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              {activeDaysThisWeek}/7 days active this week
            </ThemedText>
          </View>
        </View>
        <Spacer height={Spacing.lg} />
        
        <View style={styles.weeklyChart}>
          {weeklyActivity.map((item, index) => (
            <View key={index} style={styles.dayColumn}>
              <View
                style={[
                  styles.dayBar,
                  {
                    backgroundColor: item.active ? theme.primary : theme.border,
                    height: item.active ? 48 : 24,
                  },
                ]}
              />
              <ThemedText
                style={[
                  styles.dayLabel,
                  { color: item.active ? theme.primary : theme.textSecondary },
                ]}
              >
                {item.day}
              </ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.cardTitle}>Skill Performance</ThemedText>
        <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
          Your performance across learning domains
        </ThemedText>
        <Spacer height={Spacing.xl} />

        {domainPerformance.map((item) => (
          <View key={item.domain} style={styles.domainItem}>
            <View style={styles.domainHeader}>
              <View style={[styles.domainIcon, { backgroundColor: theme.primary + "15" }]}>
                <Feather name={item.icon} size={16} color={theme.primary} />
              </View>
              <ThemedText style={styles.domainLabel}>{item.label}</ThemedText>
              <ThemedText style={[styles.domainScore, { color: theme.primary }]}>
                {item.avgScore}%
              </ThemedText>
            </View>
            <Spacer height={Spacing.sm} />
            <ProgressBar progress={item.avgScore / 100} />
            <View style={styles.domainStats}>
              <ThemedText style={[styles.domainStat, { color: theme.textSecondary }]}>
                {item.attempts} attempts
              </ThemedText>
            </View>
            <Spacer height={Spacing.md} />
          </View>
        ))}
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.cardTitle}>Learning Progress</ThemedText>
        <Spacer height={Spacing.lg} />

        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Feather name="book-open" size={18} color={theme.primary} />
            <ThemedText style={styles.progressLabel}>Lessons Completed</ThemedText>
            <ThemedText style={[styles.progressValue, { color: theme.primary }]}>
              {stats.completedLessons}/{stats.totalLessons}
            </ThemedText>
          </View>
          <Spacer height={Spacing.sm} />
          <ProgressBar progress={stats.completedLessons / stats.totalLessons} />
        </View>

        <Spacer height={Spacing.lg} />

        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Feather name="check-circle" size={18} color={theme.success} />
                <ThemedText style={styles.progressLabel}>Quizzes Passed</ThemedText>
                <ThemedText style={[styles.progressValue, { color: theme.success }]}>
                  {stats.completedQuizzes}
                </ThemedText>
              </View>
            </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.moduleProgressHeader}>
          <ThemedText style={styles.cardTitle}>Course Progress</ThemedText>
        </View>
        <Spacer height={Spacing.lg} />

        {courses.map((course) => {
          const courseProgress = getCourseProgress(course.id);
          const completedInCourse = courseProgress.completed;
          const progress = courseProgress.percentage;

          return (
            <View key={course.id} style={styles.moduleItem}>
              <View style={styles.moduleHeader}>
                <ThemedText style={styles.moduleTitle} numberOfLines={1}>
                  {course.title}
                </ThemedText>
                <ThemedText style={[styles.moduleCount, { color: theme.textSecondary }]}>
                  {completedInCourse}/{course.lessons.length}
                </ThemedText>
              </View>
              <Spacer height={Spacing.sm} />
              <ProgressBar progress={progress / 100} />
              <Spacer height={Spacing.md} />
            </View>
          );
        })}
      </ThemedView>

      <Spacer height={Spacing["2xl"]} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    ...Typography.title,
    fontWeight: "700",
  },
  statLabel: {
    ...Typography.caption,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  card: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  cardTitle: {
    ...Typography.title,
  },
  cardSubtitle: {
    ...Typography.subhead,
    marginTop: Spacing.xs,
  },
  progressItem: {
    marginBottom: Spacing.sm,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  progressLabel: {
    ...Typography.body,
    flex: 1,
  },
  progressValue: {
    ...Typography.headline,
    fontWeight: "600",
  },
  domainItem: {
    marginBottom: Spacing.xs,
  },
  domainHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  domainIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  domainLabel: {
    ...Typography.body,
    flex: 1,
  },
  domainScore: {
    ...Typography.headline,
    fontWeight: "600",
  },
  domainStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  domainStat: {
    ...Typography.caption,
  },
  streakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  streakCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  streakValue: {
    ...Typography.title,
    fontWeight: "700",
  },
  streakLabel: {
    ...Typography.caption,
  },
  weeklyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weeklyChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.sm,
  },
  dayColumn: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  dayBar: {
    width: 32,
    borderRadius: BorderRadius.sm,
  },
  dayLabel: {
    ...Typography.caption,
    fontWeight: "600",
  },
  moduleProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moduleItem: {
    marginBottom: Spacing.sm,
  },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moduleTitle: {
    ...Typography.body,
    flex: 1,
    marginRight: Spacing.md,
  },
  moduleCount: {
    ...Typography.footnote,
  },
});
