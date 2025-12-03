import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ProgressBar } from "@/components/ProgressBar";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useLearningProgress } from "@/hooks/useLearningProgress";
import { modules } from "../mock/modules";

const { width: screenWidth } = Dimensions.get("window");

const mockWeeklyData = [
  { day: "Mon", minutes: 15, lessons: 2 },
  { day: "Tue", minutes: 25, lessons: 3 },
  { day: "Wed", minutes: 10, lessons: 1 },
  { day: "Thu", minutes: 30, lessons: 4 },
  { day: "Fri", minutes: 20, lessons: 2 },
  { day: "Sat", minutes: 45, lessons: 5 },
  { day: "Sun", minutes: 35, lessons: 3 },
];

const mockMonthlyProgress = [
  { week: "W1", progress: 15 },
  { week: "W2", progress: 35 },
  { week: "W3", progress: 52 },
  { week: "W4", progress: 68 },
];

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const { getLessonStatus } = useLearningProgress();

  const stats = useMemo(() => {
    let completedLessons = 0;
    let totalLessons = 0;
    let completedQuizzes = 0;
    let totalQuizzes = 0;

    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        if (lesson.type === "quiz") {
          totalQuizzes++;
          if (getLessonStatus(lesson.id) === "completed") {
            completedQuizzes++;
          }
        } else {
          totalLessons++;
          if (getLessonStatus(lesson.id) === "completed") {
            completedLessons++;
          }
        }
      });
    });

    return {
      completedLessons,
      totalLessons,
      completedQuizzes,
      totalQuizzes,
      streak: 7,
      totalXP: 1920,
      weeklyMinutes: mockWeeklyData.reduce((sum, d) => sum + d.minutes, 0),
    };
  }, [getLessonStatus]);

  const maxMinutes = Math.max(...mockWeeklyData.map((d) => d.minutes));

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.lg} />

      <View style={styles.statsRow}>
        <ThemedView style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="zap" size={20} color={theme.primary} />
          </View>
          <ThemedText style={styles.statValue}>{stats.streak}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.success + "15" }]}>
            <Feather name="award" size={20} color={theme.success} />
          </View>
          <ThemedText style={styles.statValue}>{stats.totalXP}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Total XP</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.warning + "15" }]}>
            <Feather name="clock" size={20} color={theme.warning} />
          </View>
          <ThemedText style={styles.statValue}>{stats.weeklyMinutes}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Min This Week</ThemedText>
        </ThemedView>
      </View>

      <Spacer height={Spacing.xl} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.cardTitle}>Weekly Activity</ThemedText>
        <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
          Minutes spent learning each day
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <View style={styles.chartContainer}>
          {mockWeeklyData.map((item, index) => (
            <View key={item.day} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: (item.minutes / maxMinutes) * 120,
                      backgroundColor: index === 5 ? theme.primary : theme.primary + "60",
                    },
                  ]}
                />
              </View>
              <ThemedText style={[styles.barLabel, { color: theme.textSecondary }]}>{item.day}</ThemedText>
              <ThemedText style={[styles.barValue, { color: theme.primary }]}>{item.minutes}</ThemedText>
            </View>
          ))}
        </View>
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
          <ProgressBar progress={(stats.completedLessons / stats.totalLessons) * 100} />
        </View>

        <Spacer height={Spacing.lg} />

        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Feather name="help-circle" size={18} color={theme.success} />
            <ThemedText style={styles.progressLabel}>Quizzes Passed</ThemedText>
            <ThemedText style={[styles.progressValue, { color: theme.success }]}>
              {stats.completedQuizzes}/{stats.totalQuizzes}
            </ThemedText>
          </View>
          <Spacer height={Spacing.sm} />
          <ProgressBar progress={(stats.completedQuizzes / stats.totalQuizzes) * 100} />
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.cardTitle}>Monthly Overview</ThemedText>
        <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
          Your progress over the past month
        </ThemedText>
        <Spacer height={Spacing.xl} />

        <View style={styles.monthlyChart}>
          {mockMonthlyProgress.map((item, index) => (
            <View key={item.week} style={styles.monthlyBar}>
              <View style={styles.monthlyBarTrack}>
                <View
                  style={[
                    styles.monthlyBarFill,
                    {
                      width: `${item.progress}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.monthlyBarLabels}>
                <ThemedText style={[styles.monthlyLabel, { color: theme.textSecondary }]}>{item.week}</ThemedText>
                <ThemedText style={[styles.monthlyValue, { color: theme.primary }]}>{item.progress}%</ThemedText>
              </View>
            </View>
          ))}
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.moduleProgressHeader}>
          <ThemedText style={styles.cardTitle}>Module Progress</ThemedText>
        </View>
        <Spacer height={Spacing.lg} />

        {modules.map((module) => {
          const completedInModule = module.lessons.filter(
            (l) => getLessonStatus(l.id) === "completed"
          ).length;
          const progress = (completedInModule / module.lessons.length) * 100;

          return (
            <View key={module.id} style={styles.moduleItem}>
              <View style={styles.moduleHeader}>
                <ThemedText style={styles.moduleTitle} numberOfLines={1}>
                  {module.title}
                </ThemedText>
                <ThemedText style={[styles.moduleCount, { color: theme.textSecondary }]}>
                  {completedInModule}/{module.lessons.length}
                </ThemedText>
              </View>
              <Spacer height={Spacing.sm} />
              <ProgressBar progress={progress} />
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
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  barContainer: {
    alignItems: "center",
    flex: 1,
  },
  barWrapper: {
    height: 120,
    justifyContent: "flex-end",
  },
  bar: {
    width: 24,
    borderRadius: BorderRadius.xs,
  },
  barLabel: {
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
  barValue: {
    ...Typography.caption,
    fontWeight: "600",
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
  monthlyChart: {
    gap: Spacing.lg,
  },
  monthlyBar: {
    gap: Spacing.sm,
  },
  monthlyBarTrack: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
  },
  monthlyBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  monthlyBarLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  monthlyLabel: {
    ...Typography.footnote,
  },
  monthlyValue: {
    ...Typography.footnote,
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
