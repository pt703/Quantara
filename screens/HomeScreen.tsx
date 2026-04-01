import React, { useMemo, useCallback, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat } from 'react-native-reanimated';
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BorderRadius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useUserData } from "@/hooks/useUserData";
import { useModuleProgress } from "@/hooks/useModuleProgress";
import { useAdaptiveRecommendations, AdaptiveRecommendation } from "@/hooks/useAdaptiveRecommendations";
import { courses } from "../mock/courses";
import { Course, LessonModule } from "@/types";

function SkeletonCard() {
  const { theme } = useTheme();
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.9, { duration: 900 }), -1, true);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const bg = theme.backgroundTertiary;

  return (
    <Animated.View style={[skeletonStyles.card, pulseStyle, { backgroundColor: theme.card }]}>
      <View style={[skeletonStyles.tag, { backgroundColor: bg }]} />
      <View style={[skeletonStyles.lineWide, { backgroundColor: bg, marginTop: Spacing.lg }]} />
      <View style={[skeletonStyles.lineNarrow, { backgroundColor: bg }]} />
      <View style={[skeletonStyles.lineNarrow, { backgroundColor: bg, width: '50%' }]} />
      <View style={[skeletonStyles.meta, { backgroundColor: bg }]} />
      <View style={[skeletonStyles.button, { backgroundColor: bg }]} />
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    width: 260,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  tag: {
    width: 60,
    height: 22,
    borderRadius: BorderRadius.full,
  },
  lineWide: {
    height: 14,
    borderRadius: BorderRadius.xs,
    width: '85%',
    marginBottom: Spacing.sm,
  },
  lineNarrow: {
    height: 12,
    borderRadius: BorderRadius.xs,
    width: '70%',
    marginBottom: Spacing.sm,
  },
  meta: {
    height: 12,
    borderRadius: BorderRadius.xs,
    width: '40%',
    marginTop: Spacing.sm,
  },
  button: {
    height: 40,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
});

type RootTabParamList = {
  HomeTab: undefined;
  LearnTab: { screen: string; params: object };
  ChallengesTab: { screen: string; params: object };
  SocialTab: undefined;
  ProfileTab: undefined;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const { theme, isDark } = useTheme();
  const { profile, financial } = useUserData();
  const { moduleProgress, getLessonProgress, reload: reloadModuleProgress } = useModuleProgress();
  const { generateRecommendations, isLoading: recommendationsLoading, getAllPerformanceStats } = useAdaptiveRecommendations();

  // Entrance animation
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(20);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 400 });
    slideAnim.value = withTiming(0, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

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
      <Animated.View style={animatedStyle}>
        <Spacer height={Spacing.lg} />

        {/* Financial Snapshot */}
        <ThemedView style={[styles.card, Shadows.md, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Financial Snapshot</ThemedText>
            <View style={[styles.iconBadge, { backgroundColor: theme.primary + '15' }]}>
              <Feather name="trending-up" size={16} color={theme.primary} />
            </View>
          </View>

          <View style={styles.snapshotGrid}>
            <View style={[styles.snapshotItem, { backgroundColor: theme.backgroundSecondary, borderRadius: BorderRadius.md }]}>
              <Feather name="dollar-sign" size={16} color="#10B981" style={styles.snapshotIcon} />
              <ThemedText style={[styles.snapshotLabel, { color: theme.textSecondary }]}>
                Monthly Income
              </ThemedText>
              <ThemedText style={[styles.snapshotValue, { color: '#10B981' }]}>
                £{financial.monthlyIncome.toLocaleString()}
              </ThemedText>
            </View>

            <View style={[styles.snapshotItem, { backgroundColor: theme.backgroundSecondary, borderRadius: BorderRadius.md }]}>
              <Feather name="credit-card" size={16} color="#EF4444" style={styles.snapshotIcon} />
              <ThemedText style={[styles.snapshotLabel, { color: theme.textSecondary }]}>
                Total Debt
              </ThemedText>
              <ThemedText style={[styles.snapshotValue, { color: '#EF4444' }]}>
                £{financial.totalDebt.toLocaleString()}
              </ThemedText>
            </View>

            <View style={[styles.snapshotItem, { backgroundColor: theme.backgroundSecondary, borderRadius: BorderRadius.md }]}>
              <Feather name="repeat" size={16} color="#F59E0B" style={styles.snapshotIcon} />
              <ThemedText style={[styles.snapshotLabel, { color: theme.textSecondary }]}>
                Subscriptions
              </ThemedText>
              <ThemedText style={[styles.snapshotValue, { color: '#F59E0B' }]}>
                {activeSubscriptions}
              </ThemedText>
            </View>

            <View style={[styles.snapshotItem, { backgroundColor: theme.backgroundSecondary, borderRadius: BorderRadius.md }]}>
              <Feather name="target" size={16} color="#8B5CF6" style={styles.snapshotIcon} />
              <ThemedText style={[styles.snapshotLabel, { color: theme.textSecondary }]}>
                Savings Goal
              </ThemedText>
              <ThemedText style={[styles.snapshotValue, { color: '#8B5CF6' }]}>
                {Math.round(savingsProgress)}%
              </ThemedText>
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

        {/* Continue Learning */}
        {continueLesson ? (
          <>
            <LinearGradient
              colors={isDark ? ['#1E40AF', '#1E3A8A'] : ['#3B82F6', '#1E40AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, styles.gradientCard, Shadows.lg]}
            >
              <View style={styles.cardHeader}>
                <ThemedText style={[styles.cardTitle, { color: '#FFFFFF', flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: 0.3 }]}>Continue Learning</ThemedText>
                <View style={[styles.moduleTypeBadge, { flexShrink: 0, marginLeft: Spacing.sm }]}>
                  <ThemedText style={styles.moduleTypeBadgeText} numberOfLines={1}>
                    {continueLesson.module.type === 'quiz' ? '🧠 Quiz' : '📖 Reading'}
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={[styles.lessonTitle, { color: '#FFFFFF', fontWeight: '600' }]}>
                {continueLesson.course.title}: {continueLesson.lesson.title}
              </ThemedText>
              <ThemedText style={[styles.lessonMeta, { color: 'rgba(255,255,255,0.7)' }]}>
                {continueLesson.module.type === 'quiz'
                  ? 'Quiz'
                  : `Reading ${continueLesson.moduleIndex + 1}`} · {continueLesson.lesson.estimatedMinutes} min
              </ThemedText>

              <Spacer height={Spacing.lg} />

              <View style={styles.progressRow}>
                <View style={styles.whiteProgressTrack}>
                  <View
                    style={[
                      styles.whiteProgressFill,
                      { width: `${Math.round(continueLesson.progress * 100)}%` },
                    ]}
                  />
                </View>
                <ThemedText style={styles.progressLabel}>
                  {continueLesson.completedModules}/{continueLesson.totalModules}
                </ThemedText>
              </View>

              <Spacer height={Spacing.lg} />

              <Pressable
                style={({ pressed }) => [styles.resumeButton, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => {
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
                <ThemedText style={styles.resumeButtonText}>Resume</ThemedText>
                <Feather name="arrow-right" size={18} color="#1E40AF" />
              </Pressable>
            </LinearGradient>

            <Spacer height={Spacing.lg} />
          </>
        ) : null}

        {/* Recommended for you */}
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={styles.sectionTitle}>Recommended for you</ThemedText>
        </View>
        <Spacer height={Spacing.md} />

        {recommendationsLoading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendationsContainer}
          >
            {[1, 2, 3].map((i) => (
              <View key={i} style={i !== 1 ? { marginLeft: Spacing.md } : undefined}>
                <SkeletonCard />
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendationsContainer}
          >
            {adaptiveRecommendations.map((rec, index) => (
              <Pressable
                key={rec.id}
                style={({ pressed }) => [
                  styles.recommendationCard,
                  Shadows.md,
                  { backgroundColor: theme.card, opacity: pressed ? 0.9 : 1 },
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
                            ? '#10B981' + '20'
                            : rec.type === 'review'
                            ? '#F59E0B' + '20'
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
                              ? '#10B981'
                              : rec.type === 'review'
                              ? '#F59E0B'
                              : theme.primary,
                        },
                      ]}
                    >
                      {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}
                    </ThemedText>
                  </View>

                  {rec.isExploration ? (
                    <View style={[styles.explorationBadge, { backgroundColor: '#F59E0B' + '20' }]}>
                      <Feather name="compass" size={12} color="#F59E0B" />
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
                  <Feather name="clock" size={13} color={theme.textSecondary} />
                  <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                    {rec.estimatedMinutes} min
                  </ThemedText>
                </View>

                <Spacer height={Spacing.md} />

                <LinearGradient
                  colors={[theme.primary, theme.primaryDark ?? '#1E40AF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startButton}
                >
                  <ThemedText style={styles.startButtonText}>Start</ThemedText>
                  <Feather name="arrow-right" size={14} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Spacer height={Spacing['2xl']} />
      </Animated.View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  gradientCard: {
    // gradient card overrides
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    ...Typography.title,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  moduleTypeBadgeText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  snapshotItem: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.md,
  },
  snapshotIcon: {
    marginBottom: Spacing.xs,
  },
  snapshotLabel: {
    ...Typography.caption,
    marginBottom: 2,
  },
  snapshotValue: {
    ...Typography.headline,
    fontWeight: '700',
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  whiteProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  whiteProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 3,
  },
  progressLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  resumeButton: {
    height: Spacing.buttonHeight,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  resumeButtonText: {
    ...Typography.headline,
    color: '#1E40AF',
  },
  sectionHeaderRow: {
    marginHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.title,
  },
  recommendationsContainer: {
    paddingHorizontal: Spacing.lg,
  },
  recommendationCard: {
    width: 260,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  recommendationCardSpacing: {
    marginLeft: Spacing.md,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    ...Typography.caption,
    fontWeight: '700',
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
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  startButtonText: {
    ...Typography.footnote,
    color: '#FFFFFF',
    fontWeight: '700',
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
