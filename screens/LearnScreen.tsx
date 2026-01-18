// =============================================================================
// LEARN SCREEN
// =============================================================================
// 
// Main screen for the Learn tab showing:
// - User's skill levels and progress summary
// - Personalized lesson recommendations (powered by contextual bandit)
// - Available courses with progress tracking
// - Gamification status (XP, streak, hearts)
//
// =============================================================================

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ProgressBar } from '@/components/ProgressBar';
import Spacer from '@/components/Spacer';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useGamification } from '@/hooks/useGamification';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';
import { courses } from '../mock/courses';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';
import { SkillDomain } from '../types';

// =============================================================================
// TYPES
// =============================================================================

type LearnScreenProps = {
  navigation: NativeStackNavigationProp<LearnStackParamList, 'Learn'>;
};

// =============================================================================
// SKILL PROGRESS COMPONENT
// =============================================================================

// Component to display a single skill level
interface SkillBarProps {
  domain: SkillDomain;
  level: number;
  color: string;
}

function SkillBar({ domain, level, color }: SkillBarProps) {
  const { theme } = useTheme();
  
  // Format domain name for display
  const displayName = domain.charAt(0).toUpperCase() + domain.slice(1);
  
  return (
    <View style={styles.skillBarContainer}>
      <View style={styles.skillBarHeader}>
        <ThemedText style={styles.skillName}>{displayName}</ThemedText>
        <ThemedText style={[styles.skillLevel, { color: theme.textSecondary }]}>
          {Math.round(level)}%
        </ThemedText>
      </View>
      <View style={[styles.skillBarBg, { backgroundColor: theme.border }]}>
        <View 
          style={[
            styles.skillBarFill, 
            { width: `${Math.min(level, 100)}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function LearnScreen({ navigation }: LearnScreenProps) {
  const { theme } = useTheme();
  
  // Gamification state
  const { 
    hearts, 
    todayXP,
    level, 
    streak,
    reload: reloadGamification,
  } = useGamification();
  
  // Adaptive learning state
  const { 
    skills,
    recommendations,
    getPersonalizedLessons,
    getCourseProgress,
    getOverallProgress,
    isCourseAssessed,
    reload: reloadLearning,
  } = useAdaptiveLearning(streak);

  // Refresh data when screen comes into focus (e.g., returning from a lesson)
  // Note: We intentionally exclude getPersonalizedLessons from deps to prevent infinite loops
  // The reload functions are stable, but getPersonalizedLessons changes on every state update
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        await Promise.all([reloadGamification(), reloadLearning()]);
        getPersonalizedLessons(3);
      };
      refreshData();
    }, [reloadGamification, reloadLearning]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Overall progress
  const overallProgress = useMemo(() => getOverallProgress(), [getOverallProgress]);

  // Course progress for each course
  const coursesWithProgress = useMemo(() => {
    return courses.map(course => ({
      ...course,
      progress: getCourseProgress(course.id),
    }));
  }, [getCourseProgress]);

  // Skill colors
  const skillColors: Record<SkillDomain, string> = {
    budgeting: '#10B981',  // Green
    saving: '#3B82F6',     // Blue
    debt: '#EF4444',       // Red
    investing: '#8B5CF6',  // Purple
    credit: '#F59E0B',     // Amber
  };

  return (
    <ScreenScrollView>
      {/* ================================================================== */}
      {/* GAMIFICATION HEADER */}
      {/* ================================================================== */}
      <View style={[styles.statsHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Hearts */}
        <View style={styles.statItem}>
          <Feather name="heart" size={20} color="#EF4444" />
          <ThemedText style={styles.statValue}>{hearts}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Hearts</ThemedText>
        </View>

        {/* Streak */}
        <View style={styles.statItem}>
          <Feather name="zap" size={20} color="#F59E0B" />
          <ThemedText style={styles.statValue}>{streak}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</ThemedText>
        </View>

        {/* XP / Level */}
        <View style={styles.statItem}>
          <Feather name="award" size={20} color={theme.primary} />
          <ThemedText style={styles.statValue}>Lvl {level}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{todayXP} XP today</ThemedText>
        </View>
      </View>

      <Spacer height={Spacing.lg} />

      {/* ================================================================== */}
      {/* TEST YOUR SKILL */}
      {/* ================================================================== */}
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Test Your Skill</ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Quick assessment to identify your strengths
        </ThemedText>
      </View>

      <Spacer height={Spacing.sm} />

      <Pressable
        style={({ pressed }) => [
          styles.testSkillCard,
          { 
            backgroundColor: theme.primary + '15', 
            borderColor: theme.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => navigation.navigate('TestYourSkill')}
      >
        <View style={[styles.testSkillIcon, { backgroundColor: theme.primary }]}>
          <Feather name="target" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.testSkillContent}>
          <ThemedText style={styles.testSkillTitle}>
            Take a Skill Assessment
          </ThemedText>
          <ThemedText style={[styles.testSkillSubtitle, { color: theme.textSecondary }]}>
            10 questions across all topics
          </ThemedText>
        </View>

        <Feather name="chevron-right" size={24} color={theme.primary} />
      </Pressable>

      <Spacer height={Spacing.md} />

      {/* AI Practice Mode */}
      <Pressable
        style={({ pressed }) => [
          styles.testSkillCard,
          { 
            backgroundColor: theme.warning + '15', 
            borderColor: theme.warning,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => navigation.navigate('AIPractice')}
      >
        <View style={[styles.testSkillIcon, { backgroundColor: theme.warning }]}>
          <Feather name="cpu" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.testSkillContent}>
          <ThemedText style={styles.testSkillTitle}>
            AI Practice Mode
          </ThemedText>
          <ThemedText style={[styles.testSkillSubtitle, { color: theme.textSecondary }]}>
            Personalized questions using your finances
          </ThemedText>
        </View>

        <Feather name="chevron-right" size={24} color={theme.warning} />
      </Pressable>

      <Spacer height={Spacing.xl} />

      {/* ================================================================== */}
      {/* SKILL LEVELS */}
      {/* ================================================================== */}
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Your Skills</ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Based on your quiz performance
        </ThemedText>
      </View>

      <Spacer height={Spacing.sm} />

      <View style={[styles.skillsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <SkillBar domain="budgeting" level={skills.budgeting} color={skillColors.budgeting} />
        <Spacer height={Spacing.md} />
        <SkillBar domain="saving" level={skills.saving} color={skillColors.saving} />
        <Spacer height={Spacing.md} />
        <SkillBar domain="debt" level={skills.debt} color={skillColors.debt} />
        <Spacer height={Spacing.md} />
        <SkillBar domain="credit" level={skills.credit} color={skillColors.credit} />
        <Spacer height={Spacing.md} />
        <SkillBar domain="investing" level={skills.investing} color={skillColors.investing} />
      </View>

      <Spacer height={Spacing.xl} />

      {/* ================================================================== */}
      {/* COURSES */}
      {/* ================================================================== */}
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Courses</ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          {overallProgress.lessonsCompleted} of {overallProgress.totalLessons} lessons completed
        </ThemedText>
      </View>

      <Spacer height={Spacing.sm} />

      {coursesWithProgress.map((course) => (
        <React.Fragment key={course.id}>
          <Pressable
            style={({ pressed }) => [
              styles.courseCard,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => {
              // Check if user has taken the assessment for this course
              if (!isCourseAssessed(course.id)) {
                // First time entering - show pre-assessment
                navigation.navigate('PreAssessment', { courseId: course.id });
                return;
              }
              
              // Navigate to course detail showing lesson/module structure
              navigation.navigate('CourseDetail', { courseId: course.id });
            }}
          >
            {/* Course icon */}
            <View style={[styles.courseIcon, { backgroundColor: course.color + '20' }]}>
              <Feather name={course.icon as any} size={28} color={course.color} />
            </View>

            {/* Course info */}
            <View style={styles.courseInfo}>
              <ThemedText style={styles.courseTitle}>{course.title}</ThemedText>
              <ThemedText style={[styles.courseDescription, { color: theme.textSecondary }]} numberOfLines={1}>
                {course.description}
              </ThemedText>
              
              <Spacer height={Spacing.sm} />
              
              <View style={styles.courseProgress}>
                <View style={{ flex: 1, marginRight: Spacing.md }}>
                  <ProgressBar 
                    progress={course.progress.percentage} 
                    color={course.color}
                    height={6}
                  />
                </View>
                <ThemedText style={[styles.courseProgressText, { color: theme.textSecondary }]}>
                  {course.progress.completed}/{course.progress.total}
                </ThemedText>
              </View>
            </View>

            <Feather name="chevron-right" size={24} color={theme.textSecondary} />
          </Pressable>

          <Spacer height={Spacing.md} />
        </React.Fragment>
      ))}

      <Spacer height={Spacing['3xl']} />
    </ScreenScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.headline,
    marginTop: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.headline,
    fontSize: 20,
  },
  sectionSubtitle: {
    ...Typography.subhead,
    marginTop: 2,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    ...Typography.headline,
  },
  recommendationSubtitle: {
    ...Typography.subhead,
    marginTop: 2,
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  recommendationMetaText: {
    ...Typography.caption,
    marginLeft: 4,
  },
  skillsCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  skillBarContainer: {
    marginBottom: Spacing.xs,
  },
  skillBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  skillName: {
    ...Typography.subhead,
    fontWeight: '500',
  },
  skillLevel: {
    ...Typography.caption,
  },
  skillBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  courseIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    ...Typography.headline,
  },
  courseDescription: {
    ...Typography.subhead,
  },
  courseProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseProgressText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  testSkillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  testSkillIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  testSkillContent: {
    flex: 1,
  },
  testSkillTitle: {
    ...Typography.headline,
  },
  testSkillSubtitle: {
    ...Typography.subhead,
    marginTop: 2,
  },
});
