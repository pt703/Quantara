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

  // Current question index in the dynamic queue
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Dynamic question queue - starts with original questions, grows when wrong answers occur
  // Duolingo-style: wrong answers add the question back to the queue for repetition
  const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
  
  // Track state of each question attempt (indexed by queue position)
  const [questionStates, setQuestionStates] = useState<QuestionState[]>([]);
  
  // Track how many times each original question was answered correctly
  // Key: question.id, Value: number of times answered correctly (need 1 to "master")
  const [questionMastery, setQuestionMastery] = useState<Record<string, number>>({});
  
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
  
  // Track if this is a repeated question (for UI feedback)
  const [isRepeatQuestion, setIsRepeatQuestion] = useState(false);

  // Animation values
  const progressWidth = useSharedValue(0);
  const xpScale = useSharedValue(1);

  // ==========================================================================
  // DERIVED VALUES
  // ==========================================================================

  const lesson = lessonData?.lesson;
  const course = lessonData?.course;
  const originalQuestions = lesson?.questions || [];
  
  // Current question from the dynamic queue
  const currentQuestion = questionQueue[currentQuestionIndex];
  
  // Original question count (used for progress calculation)
  const originalQuestionCount = originalQuestions.length;
  
  // Count unique questions mastered (answered correctly at least once)
  const masteredCount = Object.keys(questionMastery).filter(
    id => questionMastery[id] >= 1
  ).length;
  
  // Progress is based on unique questions mastered, not queue position
  const progress = originalQuestionCount > 0 
    ? (masteredCount / originalQuestionCount) * 100 
    : 0;

  // Count correct answers for accuracy calculation
  const correctCount = questionStates.filter(s => s === 'correct').length;
  const accuracy = questionQueue.length > 0 ? correctCount / questionQueue.length : 0;

  // Initialize question queue with original questions
  useEffect(() => {
    if (originalQuestions.length > 0 && questionQueue.length === 0) {
      setQuestionQueue([...originalQuestions]);
      setQuestionStates(new Array(originalQuestions.length).fill('unanswered'));
    }
  }, [originalQuestions.length, questionQueue.length]);

  // Animate progress bar
  useEffect(() => {
    progressWidth.value = withSpring(progress);
  }, [progress, progressWidth]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Called when user answers a question.
   * Updates state, shows feedback, handles hearts, and implements
   * Duolingo-style question repetition for wrong answers.
   */
  const handleAnswer = useCallback((result: QuestionResult) => {
    if (!currentQuestion) return;
    
    // Update question state for this attempt
    const newStates = [...questionStates];
    newStates[currentQuestionIndex] = result.isCorrect ? 'correct' : 'incorrect';
    setQuestionStates(newStates);

    // Handle correct answer
    if (result.isCorrect) {
      // Add XP with animation (reduced XP for repeated questions)
      const xpAmount = isRepeatQuestion ? Math.round(result.xpEarned * 0.5) : result.xpEarned;
      setXpEarned(prev => prev + xpAmount);
      xpScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1)
      );
      
      // Mark question as mastered
      setQuestionMastery(prev => ({
        ...prev,
        [currentQuestion.id]: (prev[currentQuestion.id] || 0) + 1,
      }));
    } else {
      // Lose a heart on wrong answer
      loseHeart();
      setHeartsLost(prev => prev + 1);
      
      // DUOLINGO-STYLE REPETITION: Add the question back to the queue
      // The question will appear again later for the user to practice
      setQuestionQueue(prev => [...prev, currentQuestion]);
      setQuestionStates(prev => [...prev, 'unanswered']);
    }

    // Show explanation
    setLastAnswerCorrect(result.isCorrect);
    setCurrentExplanation(currentQuestion?.explanation || '');
    
    // Short delay then show explanation
    setTimeout(() => {
      setShowExplanation(true);
    }, 800);
  }, [currentQuestionIndex, questionStates, currentQuestion, loseHeart, xpScale, isRepeatQuestion]);

  /**
   * Called when user closes explanation and moves to next question.
   * Duolingo-style: lesson completes only when all unique questions are mastered.
   */
  const handleContinue = useCallback(() => {
    setShowExplanation(false);

    // Check if all original questions are mastered (answered correctly at least once)
    const allMastered = originalQuestions.every(q => (questionMastery[q.id] || 0) >= 1);
    
    // Also check if we've reached the end of the current queue
    const reachedEndOfQueue = currentQuestionIndex >= questionQueue.length - 1;

    if (allMastered && reachedEndOfQueue) {
      // Lesson complete - all questions mastered!
      handleLessonComplete();
    } else if (reachedEndOfQueue) {
      // Still have questions in queue that need mastering
      // This shouldn't happen if we're adding wrong answers back, but just in case
      handleLessonComplete();
    } else {
      // Move to next question in queue
      setCurrentQuestionIndex(prev => prev + 1);
      
      // Check if next question is a repeat (user got it wrong before)
      const nextQuestion = questionQueue[currentQuestionIndex + 1];
      if (nextQuestion && questionMastery[nextQuestion.id] === undefined) {
        setIsRepeatQuestion(false);
      } else {
        // This question has been seen before (either mastered or attempted)
        const wasIncorrectBefore = !questionMastery[nextQuestion?.id];
        setIsRepeatQuestion(wasIncorrectBefore);
      }
    }
  }, [currentQuestionIndex, questionQueue, originalQuestions, questionMastery]);

  /**
   * Called when all questions are answered and mastered.
   */
  const handleLessonComplete = useCallback(() => {
    if (!lesson || !course) return;

    // Calculate final stats
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    // Perfect score = mastered all questions on first try (no repeats needed)
    const isPerfect = questionQueue.length === originalQuestionCount;

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
  }, [lesson, course, startTime, originalQuestionCount, questionQueue.length, xpEarned, gainXP, recordLessonAttempt, recordLessonComplete, lessonId, accuracy]);

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
  if (originalQuestions.length === 0) {
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
        {/* Question counter - shows position in dynamic queue */}
        <ThemedText style={[styles.questionCounter, { color: theme.textSecondary }]}>
          Question {currentQuestionIndex + 1} of {questionQueue.length}
          {isRepeatQuestion ? ' (Review)' : ''}
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
                {currentQuestionIndex >= questionQueue.length - 1 ? 'See Results' : 'Continue'}
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

            {/* Perfect score message - achieved if no questions needed repeating */}
            {questionQueue.length === originalQuestionCount && heartsLost === 0 && (
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
