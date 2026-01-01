// =============================================================================
// LESSON PLAYER SCREEN
// =============================================================================
// 
// This is the main gamified lesson experience screen. It provides:
// - Hearts/lives display (lose heart on wrong answers)
// - Progress bar showing lesson completion
// - XP tracking and display
// - Question-by-question flow with immediate feedback
// - Explanation after each answer
// - Celebration on lesson completion
//
// The screen integrates with the gamification and adaptive learning systems.
//
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProgressBar } from '@/components/ProgressBar';
import Spacer from '@/components/Spacer';
import { QuestionRenderer, QuestionResult } from '@/components/QuestionTypes';
import { useTheme } from '@/hooks/useTheme';
import { useGamification } from '@/hooks/useGamification';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Question, Lesson, Course } from '../types';
import { getLessonById } from '../mock/courses';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';

// =============================================================================
// TYPES
// =============================================================================

type LessonPlayerScreenProps = {
  navigation: NativeStackNavigationProp<LearnStackParamList, 'LessonPlayer'>;
  route: RouteProp<LearnStackParamList, 'LessonPlayer'>;
};

// States for each question
type QuestionState = 'unanswered' | 'correct' | 'incorrect';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function LessonPlayerScreen({ navigation, route }: LessonPlayerScreenProps) {
  const { lessonId, courseId } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Get lesson data
  const lessonData = useMemo(() => getLessonById(lessonId), [lessonId]);
  
  // Gamification hooks
  const { 
    hearts, 
    loseHeart, 
    gainXP, 
    recordLessonComplete,
    streak,
    streakMultiplier,
  } = useGamification();
  
  // Adaptive learning hook
  const { recordLessonAttempt } = useAdaptiveLearning(streak);

  // ==========================================================================
  // STATE
  // ==========================================================================

  // Current question index
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Track state of each question
  const [questionStates, setQuestionStates] = useState<QuestionState[]>([]);
  
  // Show explanation modal
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  
  // Show completion modal
  const [showCompletion, setShowCompletion] = useState(false);
  
  // Track XP earned this lesson
  const [xpEarned, setXpEarned] = useState(0);
  
  // Track start time for analytics
  const [startTime] = useState(Date.now());
  
  // Track hearts lost
  const [heartsLost, setHeartsLost] = useState(0);

  // Animation values
  const progressWidth = useSharedValue(0);
  const xpScale = useSharedValue(1);

  // ==========================================================================
  // DERIVED VALUES
  // ==========================================================================

  const lesson = lessonData?.lesson;
  const course = lessonData?.course;
  const questions = lesson?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  
  // Calculate progress percentage
  const progress = totalQuestions > 0 
    ? ((currentQuestionIndex) / totalQuestions) * 100 
    : 0;

  // Count correct answers
  const correctCount = questionStates.filter(s => s === 'correct').length;
  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;

  // Initialize question states
  useEffect(() => {
    if (questions.length > 0 && questionStates.length === 0) {
      setQuestionStates(new Array(questions.length).fill('unanswered'));
    }
  }, [questions.length, questionStates.length]);

  // Animate progress bar
  useEffect(() => {
    progressWidth.value = withSpring(progress);
  }, [progress, progressWidth]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Called when user answers a question.
   * Updates state, shows feedback, and handles hearts.
   */
  const handleAnswer = useCallback((result: QuestionResult) => {
    // Update question state
    const newStates = [...questionStates];
    newStates[currentQuestionIndex] = result.isCorrect ? 'correct' : 'incorrect';
    setQuestionStates(newStates);

    // Handle correct answer
    if (result.isCorrect) {
      // Add XP with animation
      setXpEarned(prev => prev + result.xpEarned);
      xpScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1)
      );
    } else {
      // Lose a heart on wrong answer
      loseHeart();
      setHeartsLost(prev => prev + 1);
    }

    // Show explanation
    setLastAnswerCorrect(result.isCorrect);
    setCurrentExplanation(currentQuestion?.explanation || '');
    
    // Short delay then show explanation
    setTimeout(() => {
      setShowExplanation(true);
    }, 800);
  }, [currentQuestionIndex, questionStates, currentQuestion, loseHeart, xpScale]);

  /**
   * Called when user closes explanation and moves to next question.
   */
  const handleContinue = useCallback(() => {
    setShowExplanation(false);

    // Check if lesson is complete
    if (currentQuestionIndex >= totalQuestions - 1) {
      // Lesson complete!
      handleLessonComplete();
    } else {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, totalQuestions]);

  /**
   * Called when all questions are answered.
   */
  const handleLessonComplete = useCallback(() => {
    if (!lesson || !course) return;

    // Calculate final stats
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const isPerfect = correctCount === totalQuestions;

    // Award completion XP
    const completionBonus = Math.round(lesson.xpReward * 0.5);
    const totalXP = gainXP(xpEarned + completionBonus);

    // Record for adaptive learning
    recordLessonAttempt(
      lessonId,
      accuracy,
      timeSpent,
      true,  // completed
      true   // was recommended (we can enhance this later)
    );

    // Record for achievements
    recordLessonComplete(isPerfect);

    // Show completion modal
    setShowCompletion(true);
  }, [lesson, course, startTime, correctCount, totalQuestions, xpEarned, gainXP, recordLessonAttempt, recordLessonComplete, lessonId, accuracy]);

  /**
   * Called when user wants to exit the lesson early.
   */
  const handleExit = useCallback(() => {
    Alert.alert(
      'Exit Lesson?',
      'Your progress will not be saved if you leave now.',
      [
        { text: 'Stay', style: 'cancel' },
        { 
          text: 'Exit', 
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }, [navigation]);

  /**
   * Called when completion modal is dismissed.
   */
  const handleCompletionClose = useCallback(() => {
    setShowCompletion(false);
    navigation.goBack();
  }, [navigation]);

  // ==========================================================================
  // ANIMATED STYLES
  // ==========================================================================

  const xpAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpScale.value }],
  }));

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Loading or error state - lesson not found
  if (!lesson || !course) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.noHeartsContainer}>
          <Feather name="alert-circle" size={64} color={theme.textSecondary} />
          <Spacer height={Spacing.lg} />
          <ThemedText style={styles.noHeartsTitle}>Lesson Not Found</ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedText style={[styles.noHeartsText, { color: theme.textSecondary }]}>
            We could not load this lesson. Please try another one.
          </ThemedText>
          <Spacer height={Spacing.xl} />
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.exitButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.exitButtonText}>Return to Courses</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Empty questions guard
  if (questions.length === 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.noHeartsContainer}>
          <Feather name="book" size={64} color={theme.textSecondary} />
          <Spacer height={Spacing.lg} />
          <ThemedText style={styles.noHeartsTitle}>No Questions Yet</ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedText style={[styles.noHeartsText, { color: theme.textSecondary }]}>
            This lesson does not have any questions configured.
          </ThemedText>
          <Spacer height={Spacing.xl} />
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.exitButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.exitButtonText}>Return to Courses</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // No hearts left
  if (hearts <= 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.noHeartsContainer}>
          <Feather name="heart" size={64} color="#EF4444" />
          <Spacer height={Spacing.lg} />
          <ThemedText style={styles.noHeartsTitle}>Out of Hearts!</ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedText style={[styles.noHeartsText, { color: theme.textSecondary }]}>
            Hearts regenerate over time. Come back in 30 minutes for another heart.
          </ThemedText>
          <Spacer height={Spacing.xl} />
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.exitButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.exitButtonText}>Return to Courses</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* ================================================================== */}
      {/* HEADER: Progress, Hearts, XP */}
      {/* ================================================================== */}
      <View style={styles.header}>
        {/* Close button */}
        <Pressable onPress={handleExit} style={styles.closeButton}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} height={10} />
        </View>

        {/* Hearts display */}
        <View style={styles.heartsContainer}>
          <Feather name="heart" size={20} color="#EF4444" />
          <ThemedText style={styles.heartsText}>{hearts}</ThemedText>
        </View>
      </View>

      {/* XP display */}
      <Animated.View style={[styles.xpContainer, xpAnimatedStyle]}>
        <ThemedText style={[styles.xpText, { color: theme.primary }]}>
          +{xpEarned} XP
        </ThemedText>
        {streakMultiplier > 1 && (
          <ThemedText style={[styles.streakBonus, { color: theme.textSecondary }]}>
            ({Math.round((streakMultiplier - 1) * 100)}% streak bonus)
          </ThemedText>
        )}
      </Animated.View>

      <Spacer height={Spacing.lg} />

      {/* ================================================================== */}
      {/* QUESTION CONTENT */}
      {/* ================================================================== */}
      <ScrollView 
        style={styles.questionScrollView}
        contentContainerStyle={styles.questionContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Question counter */}
        <ThemedText style={[styles.questionCounter, { color: theme.textSecondary }]}>
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </ThemedText>

        <Spacer height={Spacing.lg} />

        {/* Question component */}
        {currentQuestion && (
          <QuestionRenderer
            question={currentQuestion}
            onAnswer={handleAnswer}
            disabled={questionStates[currentQuestionIndex] !== 'unanswered'}
            showResult={questionStates[currentQuestionIndex] !== 'unanswered'}
            isCorrect={questionStates[currentQuestionIndex] === 'correct'}
          />
        )}

        <Spacer height={Spacing['2xl']} />
      </ScrollView>

      {/* ================================================================== */}
      {/* EXPLANATION MODAL */}
      {/* ================================================================== */}
      <Modal
        visible={showExplanation}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.explanationModal, 
            { 
              backgroundColor: theme.card,
              borderTopColor: lastAnswerCorrect ? '#22C55E' : '#EF4444',
            }
          ]}>
            {/* Result icon */}
            <View style={[
              styles.resultIconContainer,
              { backgroundColor: lastAnswerCorrect ? '#22C55E' : '#EF4444' }
            ]}>
              <Feather 
                name={lastAnswerCorrect ? 'check' : 'x'} 
                size={32} 
                color="#FFFFFF" 
              />
            </View>

            <Spacer height={Spacing.md} />

            {/* Result text */}
            <ThemedText style={styles.resultTitle}>
              {lastAnswerCorrect ? 'Correct!' : 'Not quite...'}
            </ThemedText>

            <Spacer height={Spacing.md} />

            {/* Explanation */}
            <ThemedText style={[styles.explanationText, { color: theme.textSecondary }]}>
              {currentExplanation}
            </ThemedText>

            <Spacer height={Spacing.xl} />

            {/* Continue button */}
            <Pressable
              onPress={handleContinue}
              style={[
                styles.continueButton,
                { backgroundColor: lastAnswerCorrect ? '#22C55E' : theme.primary }
              ]}
            >
              <ThemedText style={styles.continueButtonText}>
                {currentQuestionIndex >= totalQuestions - 1 ? 'See Results' : 'Continue'}
              </ThemedText>
            </Pressable>

            <Spacer height={insets.bottom + Spacing.lg} />
          </View>
        </View>
      </Modal>

      {/* ================================================================== */}
      {/* COMPLETION MODAL */}
      {/* ================================================================== */}
      <Modal
        visible={showCompletion}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.completionModal, { backgroundColor: theme.card }]}>
            {/* Celebration icon */}
            <View style={[styles.celebrationIcon, { backgroundColor: '#22C55E' }]}>
              <Feather name="award" size={48} color="#FFFFFF" />
            </View>

            <Spacer height={Spacing.lg} />

            <ThemedText style={styles.completionTitle}>
              Lesson Complete!
            </ThemedText>

            <Spacer height={Spacing.sm} />

            <ThemedText style={[styles.completionSubtitle, { color: theme.textSecondary }]}>
              {lesson.title}
            </ThemedText>

            <Spacer height={Spacing.xl} />

            {/* Stats */}
            <View style={styles.statsContainer}>
              {/* Accuracy */}
              <View style={styles.statItem}>
                <Feather name="target" size={24} color={theme.primary} />
                <ThemedText style={styles.statValue}>
                  {Math.round(accuracy * 100)}%
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Accuracy
                </ThemedText>
              </View>

              {/* XP Earned */}
              <View style={styles.statItem}>
                <Feather name="zap" size={24} color="#EAB308" />
                <ThemedText style={styles.statValue}>
                  +{xpEarned + Math.round(lesson.xpReward * 0.5)}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  XP Earned
                </ThemedText>
              </View>

              {/* Hearts Lost */}
              <View style={styles.statItem}>
                <Feather name="heart" size={24} color="#EF4444" />
                <ThemedText style={styles.statValue}>
                  -{heartsLost}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Hearts Lost
                </ThemedText>
              </View>
            </View>

            <Spacer height={Spacing.xl} />

            {/* Perfect score message */}
            {correctCount === totalQuestions && (
              <>
                <View style={[styles.perfectBadge, { backgroundColor: '#22C55E20' }]}>
                  <Feather name="star" size={20} color="#22C55E" />
                  <ThemedText style={{ color: '#22C55E', marginLeft: Spacing.sm, fontWeight: '600' }}>
                    Perfect Score!
                  </ThemedText>
                </View>
                <Spacer height={Spacing.lg} />
              </>
            )}

            {/* Done button */}
            <Pressable
              onPress={handleCompletionClose}
              style={[styles.doneButton, { backgroundColor: theme.primary }]}
            >
              <ThemedText style={styles.doneButtonText}>
                Continue Learning
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    padding: Spacing.xs,
    marginRight: Spacing.md,
  },
  progressContainer: {
    flex: 1,
  },
  heartsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  heartsText: {
    ...Typography.headline,
    marginLeft: Spacing.xs,
    color: '#EF4444',
  },
  xpContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  xpText: {
    ...Typography.headline,
    fontSize: 18,
  },
  streakBonus: {
    ...Typography.caption,
  },
  questionScrollView: {
    flex: 1,
  },
  questionContent: {
    paddingBottom: Spacing['3xl'],
  },
  questionCounter: {
    ...Typography.subhead,
    textAlign: 'center',
  },
  noHeartsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  noHeartsTitle: {
    ...Typography.title,
  },
  noHeartsText: {
    ...Typography.body,
    textAlign: 'center',
  },
  exitButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  exitButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  explanationModal: {
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    borderTopWidth: 4,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  resultIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    ...Typography.title,
  },
  explanationText: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  continueButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  continueButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  completionModal: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionTitle: {
    ...Typography.title,
  },
  completionSubtitle: {
    ...Typography.headline,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
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
    marginTop: Spacing.xs,
  },
  perfectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  doneButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
});
