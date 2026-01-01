// =============================================================================
// COURSE DETAIL SCREEN
// =============================================================================
// 
// Displays a course with its lessons and their module structure.
// Shows:
// - Course header with progress
// - List of 11 lessons with module indicators (3 reading + 1 quiz each)
// - Visual progress for each lesson
// - Mastery gating (locked lessons until previous is complete)
// - Clear labels for "Course Progress" vs individual "Quiz Score"
//
// =============================================================================

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable, FlatList } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProgressBar } from '@/components/ProgressBar';
import Spacer from '@/components/Spacer';
import { useTheme } from '@/hooks/useTheme';
import { useModuleProgress } from '@/hooks/useModuleProgress';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { getCourseById } from '../mock/courses';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';
import { Lesson, LessonModule } from '../types';

// =============================================================================
// TYPES
// =============================================================================

type CourseDetailScreenProps = {
  navigation: NativeStackNavigationProp<LearnStackParamList, 'CourseDetail'>;
  route: RouteProp<LearnStackParamList, 'CourseDetail'>;
};

// =============================================================================
// MODULE INDICATOR COMPONENT
// =============================================================================

interface ModuleIndicatorProps {
  module: LessonModule;
  isCompleted: boolean;
  isLocked: boolean;
}

function ModuleIndicator({ module, isCompleted, isLocked }: ModuleIndicatorProps) {
  const { theme } = useTheme();
  
  const getIndicatorStyle = () => {
    if (isLocked) {
      return { 
        bgColor: theme.border, 
        icon: 'lock' as const,
        iconColor: theme.textSecondary,
      };
    }
    if (isCompleted) {
      return { 
        bgColor: '#10B981', 
        icon: 'check' as const,
        iconColor: '#FFFFFF',
      };
    }
    return { 
      bgColor: theme.backgroundSecondary, 
      icon: module.type === 'quiz' ? 'help-circle' as const : 'book-open' as const,
      iconColor: theme.textSecondary,
    };
  };
  
  const style = getIndicatorStyle();
  
  return (
    <View style={[styles.moduleIndicator, { backgroundColor: style.bgColor }]}>
      <Feather name={style.icon} size={12} color={style.iconColor} />
    </View>
  );
}

// =============================================================================
// LESSON CARD COMPONENT
// =============================================================================

interface LessonCardProps {
  lesson: Lesson;
  lessonIndex: number;
  courseColor: string;
  onPress: () => void;
  isLocked: boolean;
  completedModules: number;
  totalModules: number;
  quizScore?: number;
}

function LessonCard({
  lesson,
  lessonIndex,
  courseColor,
  onPress,
  isLocked,
  completedModules,
  totalModules,
  quizScore,
}: LessonCardProps) {
  const { theme } = useTheme();
  const progress = totalModules > 0 ? completedModules / totalModules : 0;
  
  return (
    <Pressable 
      onPress={onPress} 
      disabled={isLocked}
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[
        styles.lessonCard, 
        { backgroundColor: theme.card },
        isLocked && styles.lockedCard
      ]}>
        <View style={styles.lessonHeader}>
          <View style={[
            styles.lessonBadge, 
            { backgroundColor: isLocked ? theme.border : courseColor }
          ]}>
            <ThemedText style={styles.lessonNumber}>
              {lessonIndex + 1}
            </ThemedText>
          </View>
          
          <View style={styles.lessonInfo}>
            <ThemedText 
              style={[
                styles.lessonTitle, 
                isLocked && { color: theme.textSecondary }
              ]}
              numberOfLines={2}
            >
              {lesson.title}
            </ThemedText>
            
            <View style={styles.lessonMeta}>
              <Feather name="clock" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                {lesson.estimatedMinutes} min
              </ThemedText>
              <View style={[styles.metaDivider, { backgroundColor: theme.textSecondary }]} />
              <Feather name="zap" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                {lesson.xpReward} XP
              </ThemedText>
            </View>
          </View>
          
          {isLocked ? (
            <View style={[styles.lockIcon, { backgroundColor: theme.border }]}>
              <Feather name="lock" size={16} color={theme.textSecondary} />
            </View>
          ) : (
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          )}
        </View>
        
        <View style={styles.moduleRow}>
          {lesson.modules?.map((module, idx) => (
            <ModuleIndicator
              key={module.id}
              module={module}
              isCompleted={completedModules > idx}
              isLocked={isLocked}
            />
          ))}
        </View>
        
        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <ThemedText style={[styles.progressLabel, { color: theme.textSecondary }]}>
              Course Progress
            </ThemedText>
            {quizScore !== undefined && (
              <ThemedText style={[styles.quizScoreLabel, { color: courseColor }]}>
                Quiz: {quizScore}%
              </ThemedText>
            )}
          </View>
          <ProgressBar 
            progress={progress} 
            color={isLocked ? theme.border : courseColor}
            height={4}
          />
        </View>
      </View>
    </Pressable>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CourseDetailScreen({ navigation, route }: CourseDetailScreenProps) {
  const { courseId } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const course = useMemo(() => getCourseById(courseId), [courseId]);
  const { moduleProgress, getLessonProgress, isLessonComplete } = useModuleProgress();
  
  const courseProgress = useMemo(() => {
    if (!course) return 0;
    
    let completedLessons = 0;
    course.lessons.forEach(lesson => {
      if (lesson.modules && isLessonComplete(lesson.id, lesson.modules)) {
        completedLessons++;
      }
    });
    
    return course.lessons.length > 0 ? completedLessons / course.lessons.length : 0;
  }, [course, moduleProgress, isLessonComplete]);
  
  const handleLessonPress = useCallback((lesson: Lesson, isLocked: boolean) => {
    if (isLocked) return;
    navigation.navigate('LessonPlayer', { lessonId: lesson.id, courseId: courseId });
  }, [navigation, courseId]);
  
  const renderLesson = useCallback(({ item, index }: { item: Lesson; index: number }) => {
    if (!course) return null;
    
    const isLocked = index > 0 && !isLessonComplete(
      course.lessons[index - 1].id,
      course.lessons[index - 1].modules || []
    );
    
    const progress = item.modules ? getLessonProgress(item.id, item.modules) : null;
    const completedModules = progress
      ? Object.values(progress.moduleProgress).filter(m => m.status === 'completed').length
      : 0;
    
    const quizModule = item.modules?.find(m => m.type === 'quiz');
    const quizProgress = quizModule ? moduleProgress[quizModule.id] : undefined;
    
    return (
      <LessonCard
        lesson={item}
        lessonIndex={index}
        courseColor={course.color}
        onPress={() => handleLessonPress(item, isLocked)}
        isLocked={isLocked}
        completedModules={completedModules}
        totalModules={item.modules?.length || 0}
        quizScore={quizProgress?.score}
      />
    );
  }, [course, moduleProgress, getLessonProgress, isLessonComplete, handleLessonPress]);
  
  if (!course) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Course not found</ThemedText>
      </ThemedView>
    );
  }
  
  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        
        <View style={styles.courseHeader}>
          <View style={[styles.courseIcon, { backgroundColor: course.color }]}>
            <Feather name={course.icon as any} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.courseInfo}>
            <ThemedText style={styles.courseTitle}>{course.title}</ThemedText>
            <ThemedText style={[styles.courseDescription, { color: theme.textSecondary }]}>
              {course.description}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <ThemedText style={[styles.statValue, { color: course.color }]}>
              {course.lessons.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Lessons
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText style={[styles.statValue, { color: course.color }]}>
              {course.totalXP}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Total XP
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText style={[styles.statValue, { color: course.color }]}>
              {course.estimatedHours}h
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Duration
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.overallProgress}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressTitleText}>Course Progress</ThemedText>
            <ThemedText style={[styles.progressPercent, { color: course.color }]}>
              {Math.round(courseProgress * 100)}%
            </ThemedText>
          </View>
          <ProgressBar progress={courseProgress} color={course.color} height={8} />
        </View>
      </View>
      
      <Spacer height={Spacing.md} />
      
      <FlatList
        data={course.lessons}
        renderItem={renderLesson}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <Spacer height={Spacing.sm} />}
      />
    </ThemedView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    marginBottom: Spacing.md,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    ...Typography.title,
    marginBottom: Spacing.xs,
  },
  courseDescription: {
    ...Typography.footnote,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.headline,
  },
  statLabel: {
    ...Typography.caption,
  },
  overallProgress: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressTitleText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  progressPercent: {
    ...Typography.footnote,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  lessonCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  lockedCard: {
    opacity: 0.6,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  lessonBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  lessonNumber: {
    ...Typography.footnote,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    ...Typography.headline,
    marginBottom: Spacing.xs,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...Typography.caption,
    marginLeft: Spacing.xs,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: Spacing.sm,
  },
  lockIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  moduleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    marginTop: Spacing.xs,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    ...Typography.caption,
  },
  quizScoreLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
