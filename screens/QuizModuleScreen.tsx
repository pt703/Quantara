// =============================================================================
// QUIZ MODULE SCREEN
// =============================================================================
// 
// Gamified quiz experience with mastery-based completion:
// - User cannot leave until all questions answered correctly
// - Wrong answers inject 2 penalty questions on the same concept
// - Penalty questions are variants testing the same concept differently
// - XP rewards with reduced points for penalty questions
// - Hearts system integration
//
// This implements adaptive remediation - when users struggle with a concept,
// they practice more on that exact concept before moving forward.
//
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Modal,
  ScrollView,
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
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProgressBar } from '@/components/ProgressBar';
import Spacer from '@/components/Spacer';
import { QuestionRenderer, QuestionResult } from '@/components/QuestionTypes';
import { useTheme } from '@/hooks/useTheme';
import { useModuleProgress } from '@/hooks/useModuleProgress';
import { useGamification } from '@/hooks/useGamification';
import { useWrongAnswerRegistry } from '@/hooks/useWrongAnswerRegistry';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { QuizModule, Question } from '../types';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';
import { getConceptForQuestion, getVariantQuestions } from '../mock/conceptTags';
import { getQuestionById } from '../mock/courses';

// =============================================================================
// TYPES
// =============================================================================

type QuizModuleScreenProps = {
  navigation: NativeStackNavigationProp<LearnStackParamList, 'QuizModule'>;
  route: RouteProp<LearnStackParamList, 'QuizModule'>;
};

// Track question with penalty info
interface QueuedQuestion {
  question: Question;
  isPenalty: boolean;
  conceptId?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function QuizModuleScreen({ navigation, route }: QuizModuleScreenProps) {
  const { moduleId, lessonId, courseId, moduleIndex, totalModules } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const { recordQuizAttempt, getModuleProgress } = useModuleProgress();
  const { hearts, loseHeart, gainXP } = useGamification();
  const { registerWrongAnswer, markRemediated } = useWrongAnswerRegistry();
  
  // Get module data from route params
  const module = route.params.module as QuizModule | undefined;

  // ==========================================================================
  // STATE
  // ==========================================================================

  // Dynamic question queue - grows when wrong answers inject penalty questions
  const [questionQueue, setQuestionQueue] = useState<QueuedQuestion[]>([]);
  
  // Current position in queue
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Track mastery - must get each original question right at least once
  const [masteredQuestions, setMasteredQuestions] = useState<Set<string>>(new Set());
  
  // Track penalty questions answered correctly per concept
  const [penaltyProgress, setPenaltyProgress] = useState<Record<string, number>>({});
  
  // Current answer state
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');
  
  // Show completion modal
  const [showCompletion, setShowCompletion] = useState(false);
  
  // Stats tracking
  const [xpEarned, setXpEarned] = useState(0);
  const [heartsLost, setHeartsLost] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  // Animation values
  const progressWidth = useSharedValue(0);
  const xpScale = useSharedValue(1);

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  // Initialize queue with original questions
  useEffect(() => {
    if (module && questionQueue.length === 0) {
      const initialQueue = module.questions.map(q => ({
        question: q,
        isPenalty: false,
      }));
      setQuestionQueue(initialQueue);
    }
  }, [module, questionQueue.length]);

  // Current question
  const currentQueueItem = questionQueue[currentIndex];
  const currentQuestion = currentQueueItem?.question;
  
  // Original question count (for mastery tracking)
  const originalQuestionCount = module?.questions.length || 0;
  
  // Calculate progress based on mastery (unique questions answered correctly)
  const progress = originalQuestionCount > 0 
    ? (masteredQuestions.size / originalQuestionCount) * 100 
    : 0;

  // Animate progress bar
  useEffect(() => {
    progressWidth.value = withSpring(progress);
  }, [progress, progressWidth]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Handle answer submission
  const handleAnswer = useCallback((result: QuestionResult) => {
    if (!currentQuestion) return;
    
    setIsAnswered(true);
    setLastAnswerCorrect(result.isCorrect);
    setCurrentExplanation(currentQuestion.explanation);
    setTotalAttempts(prev => prev + 1);
    
    if (result.isCorrect) {
      // Correct answer
      setTotalCorrect(prev => prev + 1);
      
      // Award XP (reduced for penalty questions)
      const xpAmount = currentQueueItem.isPenalty 
        ? Math.round(result.xpEarned * 0.5) 
        : result.xpEarned;
      setXpEarned(prev => prev + xpAmount);
      gainXP(xpAmount);
      
      // Animate XP
      xpScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1)
      );
      
      // Mark as mastered if original question
      if (!currentQueueItem.isPenalty) {
        setMasteredQuestions(prev => new Set([...prev, currentQuestion.id]));
      } else if (currentQueueItem.conceptId) {
        // Track penalty progress
        setPenaltyProgress(prev => ({
          ...prev,
          [currentQueueItem.conceptId!]: (prev[currentQueueItem.conceptId!] || 0) + 1,
        }));
        
        // Check if concept is remediated (2 penalty questions correct)
        const newCount = (penaltyProgress[currentQueueItem.conceptId] || 0) + 1;
        if (newCount >= 2) {
          markRemediated(currentQueueItem.conceptId);
        }
      }
    } else {
      // Wrong answer
      loseHeart();
      setHeartsLost(prev => prev + 1);
      
      // Find concept for this question
      const concept = getConceptForQuestion(currentQuestion.id);
      
      if (concept && !currentQueueItem.isPenalty) {
        // Get 2 variant questions for penalty
        const variantIds = getVariantQuestions(concept.id, currentQuestion.id).slice(0, 2);
        
        // Add penalty questions to queue
        const penaltyQuestions: QueuedQuestion[] = [];
        for (const id of variantIds) {
          const q = getQuestionById(id);
          if (q) {
            penaltyQuestions.push({ question: q, isPenalty: true, conceptId: concept.id });
          }
        }
        
        if (penaltyQuestions.length > 0) {
          setQuestionQueue(prev => [...prev, ...penaltyQuestions]);
        }
        
        // Register wrong answer for remediation tracking
        registerWrongAnswer(
          currentQuestion.id,
          concept.id,
          currentQuestion.type,
          lessonId,
          variantIds[0]
        );
      }
      
      // Add original question back to queue for retry
      setQuestionQueue(prev => [...prev, { question: currentQuestion, isPenalty: false }]);
    }
  }, [currentQuestion, currentQueueItem, gainXP, loseHeart, xpScale, lessonId, registerWrongAnswer, markRemediated, penaltyProgress]);

  // Handle continue after answer
  const handleContinue = useCallback(() => {
    setIsAnswered(false);
    
    // Check if all original questions mastered
    const allMastered = module?.questions.every(q => masteredQuestions.has(q.id));
    const atEndOfQueue = currentIndex >= questionQueue.length - 1;
    
    if (allMastered && atEndOfQueue) {
      // Quiz complete! Record score and show completion
      const score = Math.round((totalCorrect / totalAttempts) * 100);
      recordQuizAttempt(moduleId, score, module?.masteryThreshold);
      setShowCompletion(true);
    } else if (atEndOfQueue && !allMastered) {
      // Still have questions - this shouldn't happen if we re-queue wrong answers
      // But just in case, complete the quiz
      const score = Math.round((totalCorrect / totalAttempts) * 100);
      recordQuizAttempt(moduleId, score, module?.masteryThreshold);
      setShowCompletion(true);
    } else {
      // Move to next question
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, questionQueue, module, masteredQuestions, totalCorrect, totalAttempts, moduleId, recordQuizAttempt]);

  // Handle completion dismiss
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

  if (!module) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedText>Quiz not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <View style={styles.header}>
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
          Question {currentIndex + 1} of {questionQueue.length}
          {currentQueueItem?.isPenalty ? ' (Practice)' : ''}
        </ThemedText>

        <Spacer height={Spacing.lg} />

        {/* Question component */}
        {currentQuestion && (
          <QuestionRenderer
            question={currentQuestion}
            onAnswer={handleAnswer}
            disabled={isAnswered}
            showResult={isAnswered}
            isCorrect={lastAnswerCorrect}
          />
        )}

        <Spacer height={Spacing['2xl']} />
      </ScrollView>

      {/* ================================================================== */}
      {/* EXPLANATION MODAL */}
      {/* ================================================================== */}
      <Modal
        visible={isAnswered}
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

            {!lastAnswerCorrect && !currentQueueItem?.isPenalty && (
              <>
                <Spacer height={Spacing.sm} />
                <ThemedText style={[styles.penaltyNote, { color: '#EF4444' }]}>
                  2 practice questions added
                </ThemedText>
              </>
            )}

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
                Continue
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
              Quiz Complete!
            </ThemedText>

            <Spacer height={Spacing.sm} />

            <ThemedText style={[styles.completionSubtitle, { color: theme.textSecondary }]}>
              {module.title}
            </ThemedText>

            <Spacer height={Spacing.xl} />

            {/* Stats */}
            <View style={styles.statsContainer}>
              {/* Accuracy */}
              <View style={styles.statItem}>
                <Feather name="target" size={24} color={theme.primary} />
                <ThemedText style={styles.statValue}>
                  {Math.round((totalCorrect / totalAttempts) * 100)}%
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Accuracy
                </ThemedText>
              </View>

              {/* XP Earned */}
              <View style={styles.statItem}>
                <Feather name="zap" size={24} color="#EAB308" />
                <ThemedText style={styles.statValue}>
                  +{xpEarned}
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
            {heartsLost === 0 && (
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

            {/* Continue button */}
            <Pressable
              onPress={handleCompletionClose}
              style={[styles.completeButton, { backgroundColor: theme.primary }]}
            >
              <ThemedText style={styles.completeButtonText}>
                Continue
              </ThemedText>
            </Pressable>

            <Spacer height={insets.bottom} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  progressContainer: {
    flex: 1,
  },
  heartsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heartsText: {
    ...Typography.headline,
    fontWeight: '700',
  },
  xpContainer: {
    alignItems: 'center',
  },
  xpText: {
    ...Typography.headline,
    fontWeight: '700',
  },
  questionScrollView: {
    flex: 1,
  },
  questionContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  questionCounter: {
    ...Typography.footnote,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  explanationModal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderTopWidth: 4,
    alignItems: 'center',
  },
  resultIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    ...Typography.title,
    fontWeight: '700',
  },
  penaltyNote: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  explanationText: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  continueButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  continueButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontWeight: '600',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    ...Typography.largeTitle,
    fontWeight: '700',
  },
  completionSubtitle: {
    ...Typography.body,
    textAlign: 'center',
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
    ...Typography.title,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  perfectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  completeButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  completeButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
